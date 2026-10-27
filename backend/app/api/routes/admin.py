"""
Admin Ingestion Endpoints
==========================
Protected endpoints for triggering data ingestion operations.

All endpoints require an authenticated user with the 'admin' role.
These are designed to be called manually or from a scheduled job,
not from the public-facing API.

Endpoints
---------
POST /api/v1/admin/ingest/cwc-bulletin
    Fetches the latest CWC Weekly Reservoir Storage Bulletin and stores
    matched reservoir records in the ReservoirHistory table.

POST /api/v1/admin/ingest/rainfall-backfill
    Triggers the Open-Meteo ERA5-Land historical rainfall backfill for
    all seeded reservoirs.  Safe to call multiple times (idempotent).
"""

import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.models import User
from app.services.auth_service import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter()


def _require_admin(current_user: User = Depends(get_current_user)) -> User:
    """Dependency: reject requests from non-admin users."""
    if not hasattr(current_user, "role") or current_user.role is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin role required",
        )
    role_name = (
        current_user.role.name
        if hasattr(current_user.role, "name")
        else str(current_user.role)
    )
    if role_name != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin role required",
        )
    return current_user


@router.post(
    "/ingest/cwc-bulletin",
    summary="Trigger CWC Weekly Bulletin ingestion",
    tags=["Admin"],
)
def trigger_cwc_bulletin_ingest(
    db: Session = Depends(get_db),
    current_user: User = Depends(_require_admin),
):
    """
    Fetch and ingest the latest CWC Weekly Reservoir Storage Bulletin.

    - Downloads the most recent bulletin PDF from cwc.gov.in.
    - Parses storage % for known reservoirs.
    - Stores matched rows in ReservoirHistory with full provenance.
    - Updates Reservoir.data_source and Reservoir.data_status.
    - Idempotent: duplicate records for the same bulletin date are skipped.

    Returns a summary of the ingestion run.
    """
    try:
        from app.services.cwc_reservoir_ingest import ingest_cwc_bulletin
        result = ingest_cwc_bulletin(db)
        logger.info(
            f"Admin CWC bulletin ingest triggered by user {current_user.username}: "
            f"{result}"
        )
        return {
            "status": "completed",
            "source": "CWC Weekly Reservoir Storage Bulletin",
            "result": result,
        }
    except Exception as e:
        logger.error(f"CWC bulletin ingest error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ingestion failed: {str(e)}",
        )


@router.post(
    "/ingest/rainfall-backfill",
    summary="Trigger Open-Meteo historical rainfall backfill",
    tags=["Admin"],
)
def trigger_rainfall_backfill(
    db: Session = Depends(get_db),
    current_user: User = Depends(_require_admin),
):
    """
    Backfill 5 years of daily rainfall for all seeded reservoirs using
    the Open-Meteo ERA5-Land historical archive.

    - Calls the Open-Meteo archive API (free, no auth required).
    - Stores RainfallRecord rows with source metadata.
    - Idempotent: dates that already have records are skipped.
    - Maximum 2000 records per reservoir per run (rate guard).

    This operation may take 30-120 seconds depending on the number of
    reservoirs and network latency.  It runs synchronously.
    """
    try:
        from app.services.historical_rainfall_ingest import backfill_all_reservoirs
        results = backfill_all_reservoirs(db)
        total_inserted = sum(r.get("inserted", 0) for r in results)
        total_skipped  = sum(r.get("skipped", 0) for r in results)
        total_errors   = sum(r.get("errors", 0) for r in results)

        logger.info(
            f"Admin rainfall backfill triggered by user {current_user.username}: "
            f"inserted={total_inserted}, skipped={total_skipped}, errors={total_errors}"
        )
        return {
            "status": "completed",
            "source": "Open-Meteo ERA5-Land Historical Archive",
            "summary": {
                "reservoirs_processed": len(results),
                "total_inserted": total_inserted,
                "total_skipped": total_skipped,
                "total_errors": total_errors,
            },
            "details": results,
        }
    except Exception as e:
        logger.error(f"Rainfall backfill error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Backfill failed: {str(e)}",
        )
