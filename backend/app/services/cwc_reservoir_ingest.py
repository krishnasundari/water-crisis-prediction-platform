"""
CWC Reservoir Storage Ingestion Service
=========================================
Fetches CWC Weekly Bulletin data and stores official reservoir storage
percentages into the ReservoirHistory table, with full provenance tracking.

Design
------
- One ReservoirHistory row is written per bulletin per reservoir.
- The observation_date from the bulletin filename is stored in recorded_at.
- Duplicate prevention: if a ReservoirHistory row already exists for
  reservoir_id + bulletin observation week, it is skipped.
- The Reservoir.data_source and Reservoir.data_status fields are updated
  to reflect the CWC bulletin as the current source.
- water_level in ReservoirHistory is expressed as % of FRL × capacity (MCM),
  NOT as a measured gauge height in metres.  This is clearly labelled.

Data integrity guarantees
-------------------------
- Only official CWC bulletin values are stored.
- If no matching bulletin is found for a reservoir, no record is written.
- Fabricated measurements are never used.
- All records are labelled with data_source="CWC Weekly Reservoir Storage
  Bulletin (cwc.gov.in)" and data_status="Official".

Usage
-----
    from app.services.cwc_reservoir_ingest import ingest_cwc_bulletin
    from app.db.database import SessionLocal
    db = SessionLocal()
    result = ingest_cwc_bulletin(db)
    db.close()
"""

import logging
from datetime import datetime, date
from typing import Optional
from sqlalchemy.orm import Session

from app.models.models import Reservoir, ReservoirHistory
from app.providers.cwc_bulletin_provider import fetch_latest_cwc_bulletin_records

logger = logging.getLogger(__name__)

DATA_SOURCE_LABEL = "CWC Weekly Reservoir Storage Bulletin (cwc.gov.in)"
DATA_STATUS_LABEL = "Official"


def _bulletin_already_ingested(
    db: Session,
    reservoir_id: int,
    obs_date: date,
) -> bool:
    """
    Returns True if a ReservoirHistory row already exists for this
    reservoir_id and a recorded_at that falls on the bulletin's observation date.

    Prevents duplicate ingestion when the weekly job re-runs.
    """
    day_start = datetime(obs_date.year, obs_date.month, obs_date.day, 0, 0, 0)
    day_end   = datetime(obs_date.year, obs_date.month, obs_date.day, 23, 59, 59)

    existing = (
        db.query(ReservoirHistory)
        .filter(
            ReservoirHistory.reservoir_id == reservoir_id,
            ReservoirHistory.recorded_at >= day_start,
            ReservoirHistory.recorded_at <= day_end,
        )
        .first()
    )
    return existing is not None


def ingest_cwc_bulletin(db: Session) -> dict:
    """
    Fetch the latest CWC Weekly Bulletin and store matched reservoir records.

    Returns
    -------
    dict with keys:
        fetched   - int: number of records returned by the provider
        inserted  - int: new ReservoirHistory rows committed
        skipped   - int: rows skipped (duplicates or no DB match)
        errors    - int: records rejected due to validation failure
        bulletin_url      - str or None: URL of the bulletin used
        observation_date  - str or None: ISO date of the bulletin
    """
    result = {
        "fetched": 0,
        "inserted": 0,
        "skipped": 0,
        "errors": 0,
        "bulletin_url": None,
        "observation_date": None,
    }

    bulletin_records = fetch_latest_cwc_bulletin_records()
    result["fetched"] = len(bulletin_records)

    if not bulletin_records:
        logger.warning(
            "CWC bulletin ingest: provider returned no records "
            "(PDF unavailable or parse failure)"
        )
        return result

    # Record provenance from the first record (all records share the same bulletin)
    result["bulletin_url"]     = bulletin_records[0].get("bulletin_url")
    result["observation_date"] = (
        bulletin_records[0]["observation_date"].isoformat()
        if isinstance(bulletin_records[0].get("observation_date"), date)
        else None
    )

    # Build a lookup: app_reservoir_name → Reservoir ORM object
    all_reservoirs = db.query(Reservoir).all()
    reservoir_by_name = {r.name: r for r in all_reservoirs}

    inserted = 0
    skipped  = 0
    errors   = 0

    for rec in bulletin_records:
        app_name = rec.get("app_reservoir_name")
        obs_date = rec.get("observation_date")
        storage_pct = rec.get("storage_pct_frl")

        # Validate required fields
        if not app_name or obs_date is None or storage_pct is None:
            logger.warning(f"CWC bulletin ingest: incomplete record {rec} — skipping")
            errors += 1
            continue

        # Match to seeded reservoir
        reservoir = reservoir_by_name.get(app_name)
        if reservoir is None:
            logger.info(
                f"CWC bulletin ingest: no seeded reservoir named '{app_name}' — skipping"
            )
            skipped += 1
            continue

        # Duplicate check
        if _bulletin_already_ingested(db, reservoir.id, obs_date):
            logger.debug(
                f"CWC bulletin: already have record for '{app_name}' on {obs_date} — skipping"
            )
            skipped += 1
            continue

        # Derive estimated volume from storage %:
        # capacity is stored in MCM; live_storage_mcm = pct/100 * capacity
        # This is a DERIVED value, clearly labelled.
        estimated_level_mcm = round((storage_pct / 100.0) * reservoir.capacity, 2)

        recorded_at_dt = datetime(obs_date.year, obs_date.month, obs_date.day, 12, 0, 0)

        history_row = ReservoirHistory(
            reservoir_id=reservoir.id,
            # water_level stores derived MCM (pct × capacity), NOT gauge metres.
            # This is clearly annotated in the source register and is the only
            # structured storage metric available from the CWC bulletin.
            water_level=estimated_level_mcm,
            inflow=None,   # Not published in the weekly bulletin
            outflow=None,  # Not published in the weekly bulletin
            recorded_at=recorded_at_dt,
        )
        db.add(history_row)

        # Update the reservoir's current provenance metadata
        reservoir.data_source  = DATA_SOURCE_LABEL
        reservoir.data_status  = DATA_STATUS_LABEL
        reservoir.last_updated_at = recorded_at_dt
        # Update current_level to the bulletin-derived estimate (MCM)
        # Only if it differs meaningfully (>1%) from current stored value
        current_pct = (reservoir.current_level / reservoir.capacity) * 100
        if abs(current_pct - storage_pct) > 1.0:
            reservoir.current_level = estimated_level_mcm
        db.add(reservoir)

        inserted += 1
        logger.info(
            f"CWC bulletin ingest: '{app_name}' "
            f"storage={storage_pct}% FRL → "
            f"{estimated_level_mcm} MCM (capacity={reservoir.capacity} MCM) "
            f"on {obs_date}"
        )

    if inserted > 0:
        db.commit()
        logger.info(
            f"CWC bulletin ingest complete: {inserted} records inserted, "
            f"{skipped} skipped, {errors} errors"
        )

    result["inserted"] = inserted
    result["skipped"]  = skipped
    result["errors"]   = errors
    return result
