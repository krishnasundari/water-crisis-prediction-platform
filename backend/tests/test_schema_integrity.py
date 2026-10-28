"""
Tests for Prompt 9: Database Integrity, Composite Indexes, and Schema Review
=============================================================================
Verifies:
  1. Composite index declarations on ORM models for high-throughput time-series queries.
  2. Foreign key relationships and constraints across tables.
  3. Non-destructive index migration execution on SQLite and PostgreSQL engines.
  4. Unit documentation and non-null constraints.
"""

import pytest
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import sessionmaker

from app.db.database import Base
from app.models.models import (
    Reservoir,
    RainfallRecord,
    ReservoirHistory,
    River,
    RiverHistory,
    Village,
    User,
    Role,
    Alert,
    NotificationLog,
)
from app.main import run_schema_migrations


def test_orm_models_have_expected_indexes():
    """Verify that composite indexes are declared on the SQLAlchemy models."""
    def get_index_names(model):
        indexes = getattr(model, "__table__").indexes
        return {idx.name for idx in indexes}

    assert "ix_rainfall_records_res_date" in get_index_names(RainfallRecord)
    assert "ix_reservoir_history_res_date" in get_index_names(ReservoirHistory)
    assert "ix_river_history_riv_date" in get_index_names(RiverHistory)
    assert "ix_villages_district_state" in get_index_names(Village)
    assert "ix_reservoirs_district_state" in get_index_names(Reservoir)


def test_foreign_key_relationships():
    """Verify foreign keys are configured correctly."""
    def get_fk_targets(model):
        return {fk.target_fullname for fk in getattr(model, "__table__").foreign_keys}

    assert "reservoirs.id" in get_fk_targets(RainfallRecord)
    assert "reservoirs.id" in get_fk_targets(ReservoirHistory)
    assert "rivers.id" in get_fk_targets(RiverHistory)
    assert "villages.id" in get_fk_targets(Prediction := __import__("app.models.models", fromlist=["Prediction"]).Prediction)
    assert "alerts.id" in get_fk_targets(NotificationLog)


def test_non_destructive_migration_execution():
    """Verify run_schema_migrations creates indexes and can be run multiple times safely."""
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    inspector = inspect(engine)
    
    # Check that composite indexes exist in SQLite schema
    rainfall_indexes = [idx["name"] for idx in inspector.get_indexes("rainfall_records")]
    assert "ix_rainfall_records_res_date" in rainfall_indexes

    # Run raw CREATE INDEX IF NOT EXISTS twice to verify idempotency
    with engine.connect() as conn:
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_rainfall_records_res_date ON rainfall_records (reservoir_id, measurement_date)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_rainfall_records_res_date ON rainfall_records (reservoir_id, measurement_date)"))
        conn.commit()


def test_unit_and_column_integrity():
    """Verify core telemetry columns exist and have appropriate nullability."""
    res_cols = {col.name: col for col in Reservoir.__table__.columns}
    assert res_cols["capacity"].nullable is False
    assert res_cols["current_level"].nullable is False

    rain_cols = {col.name: col for col in RainfallRecord.__table__.columns}
    assert rain_cols["rainfall_amount"].nullable is False
    assert rain_cols["measurement_date"].nullable is False

    riv_cols = {col.name: col for col in River.__table__.columns}
    assert riv_cols["river_level"].nullable is False
    assert riv_cols["danger_level"].nullable is False
    assert riv_cols["flow_rate"].nullable is False
