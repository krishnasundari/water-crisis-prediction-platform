"""
PostgreSQL Migration Compatibility and Safety Tests
=====================================================
These tests verify that database initialization, connection string normalization,
non-destructive seeding, foreign key integrity, duplicate prevention, and transaction
rollbacks operate safely and correctly across SQLAlchemy database engines.

Run tests:
    pytest backend/tests/test_postgres_migration.py -v
"""

import pytest
import os
from datetime import datetime, date
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import sessionmaker

from app.db.database import (
    get_normalized_database_url,
    mask_database_url,
    Base,
)
from app.models.models import (
    Role,
    User,
    Reservoir,
    RainfallRecord,
    Village,
    River,
    ReservoirHistory,
    Alert,
)
from app.services.cwc_reservoir_ingest import _bulletin_already_ingested
from app.services.historical_rainfall_ingest import _date_already_ingested


# ---------------------------------------------------------------------------
# Test 1: URL Normalization and Sensitive String Masking
# ---------------------------------------------------------------------------

class TestDatabaseUrlHandling:

    def test_normalizes_postgres_uri(self):
        """Render / Heroku postgres:// -> postgresql+psycopg2://"""
        raw = "postgres://usr:pwd@host.render.com/dbname"
        normalized = get_normalized_database_url(raw)
        assert normalized == "postgresql+psycopg2://usr:pwd@host.render.com/dbname"

    def test_normalizes_postgresql_uri(self):
        """postgresql:// -> postgresql+psycopg2://"""
        raw = "postgresql://usr:pwd@host.com/dbname"
        normalized = get_normalized_database_url(raw)
        assert normalized == "postgresql+psycopg2://usr:pwd@host.com/dbname"

    def test_preserves_sqlite_path(self):
        """SQLite URLs remain untouched."""
        raw = "sqlite:///./water_crisis.db"
        assert get_normalized_database_url(raw) == raw

    def test_masks_passwords_in_logs(self):
        """Never expose raw credentials in logging/reports."""
        url = "postgresql+psycopg2://myuser:supersecretpass123@ep-cool-db.neon.tech/neondb"
        masked = mask_database_url(url)
        assert "supersecretpass123" not in masked
        assert ":***@" in masked
        assert "myuser" in masked

    def test_fallback_on_placeholder_or_empty(self):
        """Placeholder or empty strings safely fall back to sqlite."""
        assert get_normalized_database_url("") == "sqlite:///./water_crisis.db"
        assert get_normalized_database_url("postgresql://your_db_url") == "sqlite:///./water_crisis.db"


# ---------------------------------------------------------------------------
# Test 2: In-Memory Engine Simulation (Schema Initialization & Seeding)
# ---------------------------------------------------------------------------

@pytest.fixture
def test_db_session():
    """Provides a fresh isolated test database session per test."""
    test_engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=test_engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        test_engine.dispose()


class TestDatabaseInitializationAndSeeding:

    def test_schema_creates_all_17_models(self, test_db_session):
        """Verify that create_all generates all core tables without error."""
        inspector = inspect(test_db_session.bind)
        tables = set(inspector.get_table_names())
        expected_tables = {
            "roles", "users", "villages", "reservoirs", "rainfall_records",
            "groundwater_records", "predictions", "forecasts", "alerts",
            "reports", "ai_conversations", "password_reset_otps",
            "weather_history", "reservoir_history", "rivers",
            "river_history", "notification_logs"
        }
        assert expected_tables.issubset(tables), f"Missing tables: {expected_tables - tables}"

    def test_seed_execution_is_idempotent_and_non_destructive(self, test_db_session):
        """
        Verify that running seed_database() twice does not delete records or raise
        foreign key / unique constraint errors.
        """
        from app.db.seed import seed_database
        
        # Patch SessionLocal inside seed module to use our test session factory
        with pytest.MonkeyPatch.context() as mp:
            mp.setattr("app.db.seed.SessionLocal", lambda: test_db_session)
            
            # Run 1: First seed
            seed_database()
            res_count_1 = test_db_session.query(Reservoir).count()
            user_count_1 = test_db_session.query(User).count()
            assert res_count_1 == 13
            assert user_count_1 >= 1

            # Attach a historical child record to ensure foreign-key dependencies exist
            hist = ReservoirHistory(
                reservoir_id=1,
                water_level=1850.0,
                recorded_at=datetime.utcnow()
            )
            test_db_session.add(hist)
            test_db_session.commit()

            # Run 2: Second seed must not wipe or re-seed reservoirs or violate foreign keys
            seed_database()
            res_count_2 = test_db_session.query(Reservoir).count()
            user_count_2 = test_db_session.query(User).count()
            assert res_count_2 == res_count_1
            assert user_count_2 == user_count_1
            # Child record must survive
            assert test_db_session.query(ReservoirHistory).count() == 1


# ---------------------------------------------------------------------------
# Test 3: Duplicate Prevention in Historical Ingestion
# ---------------------------------------------------------------------------

class TestDuplicatePrevention:

    def test_cwc_bulletin_duplicate_prevention(self, test_db_session):
        """Ensure _bulletin_already_ingested prevents same-day duplicates."""
        test_res = Reservoir(
            id=101,
            name="Test Dam",
            capacity=1000.0,
            current_level=500.0,
            district="District A",
            state="State B"
        )
        test_db_session.add(test_res)
        test_db_session.commit()

        obs_date = date(2025, 5, 8)
        assert not _bulletin_already_ingested(test_db_session, 101, obs_date)

        # Insert one observation
        row = ReservoirHistory(
            reservoir_id=101,
            water_level=500.0,
            recorded_at=datetime(2025, 5, 8, 12, 0, 0)
        )
        test_db_session.add(row)
        test_db_session.commit()

        # Now must return True
        assert _bulletin_already_ingested(test_db_session, 101, obs_date)

    def test_rainfall_duplicate_prevention(self, test_db_session):
        """Ensure _date_already_ingested prevents multiple inserts for same date."""
        test_res = Reservoir(
            id=102,
            name="Test Dam 2",
            capacity=1000.0,
            current_level=500.0,
            district="District C",
            state="State D"
        )
        test_db_session.add(test_res)
        test_db_session.commit()

        date_str = "2024-06-15"
        assert not _date_already_ingested(test_db_session, 102, date_str)

        row = RainfallRecord(
            reservoir_id=102,
            district="District C",
            measurement_date=datetime(2024, 6, 15, 6, 0, 0),
            rainfall_amount=14.2
        )
        test_db_session.add(row)
        test_db_session.commit()

        assert _date_already_ingested(test_db_session, 102, date_str)


# ---------------------------------------------------------------------------
# Test 4: Transaction Rollback and Session Recovery
# ---------------------------------------------------------------------------

class TestTransactionRollback:

    def test_transaction_rollback_preserves_session_health(self, test_db_session):
        """Ensure failed transactions roll back cleanly without session corruption."""
        # Attempt an invalid insert violating NOT NULL constraint
        invalid_res = Reservoir(name=None, capacity=100.0) # name is nullable=False
        test_db_session.add(invalid_res)
        
        with pytest.raises(Exception):
            test_db_session.commit()
            
        test_db_session.rollback()

        # Session must be immediately usable for subsequent queries
        valid_res = Reservoir(
            name="Healthy Dam",
            capacity=200.0,
            current_level=150.0,
            district="District E",
            state="State F"
        )
        test_db_session.add(valid_res)
        test_db_session.commit()
        
        found = test_db_session.query(Reservoir).filter_by(name="Healthy Dam").first()
        assert found is not None
        assert found.capacity == 200.0
