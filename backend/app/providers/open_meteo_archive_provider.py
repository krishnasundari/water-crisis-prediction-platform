"""
Open-Meteo Historical Archive Integration
==========================================
Fetches real ERA5-Land reanalysis daily rainfall and temperature data
for a given latitude/longitude and date range.

Source: Open-Meteo Historical Weather API
Endpoint: https://archive-api.open-meteo.com/v1/archive
Authentication: None (free, no API key required)
License: Open — free for non-commercial use
Resolution: ~9 km (ERA5-Land), global coverage
Historical depth: 1940-01-01 to present (~2-day lag)

Documentation: https://open-meteo.com/en/docs/historical-weather-api
"""

import requests
import logging
from datetime import date, datetime, timedelta
from typing import Optional

logger = logging.getLogger(__name__)

ARCHIVE_API_URL = "https://archive-api.open-meteo.com/v1/archive"

# Timeout and retry configuration
REQUEST_TIMEOUT_SECONDS = 10
MAX_RETRIES = 2


def fetch_historical_daily_rainfall(
    latitude: float,
    longitude: float,
    start_date: date,
    end_date: date,
) -> Optional[list]:
    """
    Fetch daily precipitation and temperature records from Open-Meteo
    ERA5-Land historical archive for a specific location and date range.

    Parameters
    ----------
    latitude : float
        WGS84 latitude (decimal degrees)
    longitude : float
        WGS84 longitude (decimal degrees)
    start_date : date
        First day of the range (inclusive), e.g. date(2020, 1, 1)
    end_date : date
        Last day of the range (inclusive), e.g. date(2024, 12, 31)

    Returns
    -------
    list of dict, each with:
        {
            "date": "YYYY-MM-DD",              # observation date (local timezone)
            "precipitation_mm": float,          # total daily precipitation (mm)
            "rain_mm": float,                   # liquid rain only (mm)
            "temperature_max_c": float,         # max 2m temperature (°C)
            "temperature_min_c": float,         # min 2m temperature (°C)
            "data_source": "Open-Meteo ERA5-Land Archive",
            "retrieved_at": "ISO-8601 UTC datetime",
            "latitude": float,
            "longitude": float,
        }

    Returns None on network failure or schema validation failure.
    """
    if start_date > end_date:
        logger.error(f"start_date {start_date} is after end_date {end_date}")
        return None

    params = {
        "latitude": latitude,
        "longitude": longitude,
        "start_date": start_date.isoformat(),
        "end_date": end_date.isoformat(),
        "daily": "precipitation_sum,rain_sum,temperature_2m_max,temperature_2m_min",
        "timezone": "Asia/Kolkata",
    }

    attempt = 0
    last_error = None
    while attempt <= MAX_RETRIES:
        try:
            resp = requests.get(
                ARCHIVE_API_URL,
                params=params,
                timeout=REQUEST_TIMEOUT_SECONDS,
            )
            resp.raise_for_status()
            payload = resp.json()

            # --- Schema Validation ---
            if "daily" not in payload:
                logger.error(
                    f"Open-Meteo archive response missing 'daily' key "
                    f"for ({latitude}, {longitude})"
                )
                return None

            daily = payload["daily"]
            required_keys = {
                "time",
                "precipitation_sum",
                "rain_sum",
                "temperature_2m_max",
                "temperature_2m_min",
            }
            missing = required_keys - set(daily.keys())
            if missing:
                logger.error(
                    f"Open-Meteo archive response missing daily keys: {missing}"
                )
                return None

            times = daily["time"]
            precip = daily["precipitation_sum"]
            rain = daily["rain_sum"]
            tmax = daily["temperature_2m_max"]
            tmin = daily["temperature_2m_min"]

            if not (len(times) == len(precip) == len(rain) == len(tmax) == len(tmin)):
                logger.error(
                    "Open-Meteo archive response arrays have unequal lengths"
                )
                return None

            retrieved_at = datetime.utcnow().isoformat() + "Z"
            records = []

            for i, obs_date in enumerate(times):
                # Reject records with null precipitation (missing data)
                if precip[i] is None:
                    logger.warning(
                        f"Null precipitation for {obs_date} at "
                        f"({latitude}, {longitude}) — skipping"
                    )
                    continue

                # Validate date string format
                try:
                    datetime.strptime(obs_date, "%Y-%m-%d")
                except ValueError:
                    logger.warning(f"Malformed date string '{obs_date}' — skipping")
                    continue

                records.append({
                    "date": obs_date,
                    "precipitation_mm": float(precip[i]),
                    "rain_mm": float(rain[i]) if rain[i] is not None else 0.0,
                    "temperature_max_c": float(tmax[i]) if tmax[i] is not None else None,
                    "temperature_min_c": float(tmin[i]) if tmin[i] is not None else None,
                    "data_source": "Open-Meteo ERA5-Land Archive",
                    "retrieved_at": retrieved_at,
                    "latitude": latitude,
                    "longitude": longitude,
                })

            logger.info(
                f"Open-Meteo archive: fetched {len(records)} records "
                f"for ({latitude}, {longitude}) "
                f"from {start_date} to {end_date}"
            )
            return records

        except requests.exceptions.Timeout:
            last_error = f"Timeout after {REQUEST_TIMEOUT_SECONDS}s"
            logger.warning(
                f"Open-Meteo archive timeout (attempt {attempt + 1}) "
                f"for ({latitude}, {longitude}): {last_error}"
            )
        except requests.exceptions.HTTPError as e:
            last_error = str(e)
            logger.error(
                f"Open-Meteo archive HTTP error (attempt {attempt + 1}) "
                f"for ({latitude}, {longitude}): {last_error}"
            )
            break  # Do not retry on HTTP errors (4xx/5xx)
        except requests.exceptions.RequestException as e:
            last_error = str(e)
            logger.warning(
                f"Open-Meteo archive request error (attempt {attempt + 1}) "
                f"for ({latitude}, {longitude}): {last_error}"
            )

        attempt += 1

    logger.error(
        f"Open-Meteo archive: all {MAX_RETRIES + 1} attempts failed "
        f"for ({latitude}, {longitude}). Last error: {last_error}"
    )
    return None


def get_default_backfill_range() -> tuple:
    """
    Returns a sensible default date range for initial data backfill:
    5 years ending yesterday (to avoid the 2-day ERA5 lag).

    Returns
    -------
    (start_date, end_date) as date objects
    """
    end = date.today() - timedelta(days=3)       # 3-day buffer for ERA5 lag
    start = date(end.year - 5, end.month, end.day)  # 5 years back
    return start, end
