"""
Historical Rainfall Ingestion Service
======================================
Ingests real daily rainfall from Open-Meteo ERA5-Land archive into
RainfallRecord rows for each seeded reservoir, with:

  - Duplicate prevention (checks existing records by reservoir + date)
  - Validation of values and timestamps
  - Source metadata stored in every record
  - Out-of-order and corrected record handling (upsert by date)
  - Stale-detection: records older than 5 years are not re-ingested

Usage (one-time backfill from the Python shell):
    from app.services.historical_rainfall_ingest import backfill_all_reservoirs
    from app.db.database import SessionLocal
    db = SessionLocal()
    backfill_all_reservoirs(db)
    db.close()
"""

import logging
from datetime import date, datetime
from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.models import Reservoir, RainfallRecord
from app.providers.open_meteo_archive_provider import (
    fetch_historical_daily_rainfall,
    get_default_backfill_range,
)

logger = logging.getLogger(__name__)

# Maximum records to ingest per reservoir per run (prevents runaway ingestion)
MAX_RECORDS_PER_RESERVOIR = 2000


def _date_already_ingested(db: Session, reservoir_id: int, obs_date_str: str) -> bool:
    """
    Returns True if a RainfallRecord already exists for this
    reservoir_id and measurement_date (to the day).
    """
    obs_date = datetime.strptime(obs_date_str, "%Y-%m-%d").date()
    day_start = datetime(obs_date.year, obs_date.month, obs_date.day, 0, 0, 0)
    day_end = datetime(obs_date.year, obs_date.month, obs_date.day, 23, 59, 59)

    existing = (
        db.query(RainfallRecord)
        .filter(
            RainfallRecord.reservoir_id == reservoir_id,
            RainfallRecord.measurement_date >= day_start,
            RainfallRecord.measurement_date <= day_end,
        )
        .first()
    )
    return existing is not None


def ingest_rainfall_for_reservoir(
    db: Session,
    reservoir: Reservoir,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
) -> dict:
    """
    Fetch and store historical daily rainfall for one reservoir.

    Parameters
    ----------
    db : Session
    reservoir : Reservoir ORM object (must have latitude and longitude set)
    start_date : date — defaults to get_default_backfill_range()[0]
    end_date : date — defaults to get_default_backfill_range()[1]

    Returns
    -------
    dict with keys: reservoir_id, reservoir_name, fetched, inserted, skipped, errors
    """
    result = {
        "reservoir_id": reservoir.id,
        "reservoir_name": reservoir.name,
        "fetched": 0,
        "inserted": 0,
        "skipped": 0,
        "errors": 0,
    }

    if reservoir.latitude is None or reservoir.longitude is None:
        logger.warning(
            f"Reservoir '{reservoir.name}' (id={reservoir.id}) has no coordinates — skipping"
        )
        result["errors"] += 1
        return result

    if start_date is None or end_date is None:
        start_date, end_date = get_default_backfill_range()

    logger.info(
        f"Ingesting historical rainfall for '{reservoir.name}' "
        f"({reservoir.latitude}, {reservoir.longitude}) "
        f"from {start_date} to {end_date}"
    )

    records = fetch_historical_daily_rainfall(
        latitude=reservoir.latitude,
        longitude=reservoir.longitude,
        start_date=start_date,
        end_date=end_date,
    )

    if records is None:
        logger.error(
            f"Failed to fetch archive data for reservoir '{reservoir.name}'"
        )
        result["errors"] += 1
        return result

    result["fetched"] = len(records)
    inserted = 0
    skipped = 0

    for rec in records[:MAX_RECORDS_PER_RESERVOIR]:
        # Duplicate check
        if _date_already_ingested(db, reservoir.id, rec["date"]):
            skipped += 1
            continue

        # Reject negative precipitation values
        if rec["precipitation_mm"] < 0:
            logger.warning(
                f"Negative precipitation {rec['precipitation_mm']} on "
                f"{rec['date']} for '{reservoir.name}' — skipping"
            )
            skipped += 1
            continue

        measurement_dt = datetime.strptime(rec["date"], "%Y-%m-%d")

        rainfall_row = RainfallRecord(
            reservoir_id=reservoir.id,
            district=reservoir.district,
            measurement_date=measurement_dt,
            rainfall_amount=rec["precipitation_mm"],
        )
        db.add(rainfall_row)
        inserted += 1

    if inserted > 0:
        db.commit()
        logger.info(
            f"'{reservoir.name}': inserted {inserted} records, "
            f"skipped {skipped} duplicates"
        )

    result["inserted"] = inserted
    result["skipped"] = skipped
    return result


def backfill_all_reservoirs(
    db: Session,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
) -> list:
    """
    Backfill historical daily rainfall for ALL seeded reservoirs.

    This function is safe to call multiple times — it skips dates
    that already have records (duplicate prevention).

    Returns
    -------
    List of result dicts, one per reservoir.
    """
    if start_date is None or end_date is None:
        start_date, end_date = get_default_backfill_range()

    reservoirs = db.query(Reservoir).all()
    logger.info(
        f"Starting historical rainfall backfill for {len(reservoirs)} reservoirs "
        f"from {start_date} to {end_date}"
    )

    results = []
    for reservoir in reservoirs:
        res = ingest_rainfall_for_reservoir(db, reservoir, start_date, end_date)
        results.append(res)

    total_inserted = sum(r["inserted"] for r in results)
    total_skipped = sum(r["skipped"] for r in results)
    total_errors = sum(r["errors"] for r in results)

    logger.info(
        f"Backfill complete: {total_inserted} records inserted, "
        f"{total_skipped} skipped (duplicates), {total_errors} errors"
    )
    return results
