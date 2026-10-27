import requests
from typing import List, Dict, Any
import logging

logger = logging.getLogger(__name__)

# GDACS REST API — structured JSON endpoint (replaces fragile XML feed)
# Source: OFFICIAL_DATA_SOURCE_REGISTER.md — S3
# Auth: None | Rate: polite ≥5 min intervals | License: Open, attribution required
GDACS_REST_URL = "https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH"

# Legacy XML feed kept as secondary fallback
GDACS_XML_URL = "https://www.gdacs.org/xml/gdacs.xml"

REQUEST_TIMEOUT = 8  # seconds


class AlertProvider:
    def get_provider_name(self) -> str:
        return "Global Disaster Alert & Coordination System (GDACS)"

    def fetch_official_alerts(self) -> List[Dict[str, Any]]:
        """
        Queries GDACS REST API for India-relevant flood/disaster events.
        Falls back to GDACS XML feed on failure.
        Returns an empty list (NOT a simulated alert) if both sources fail.

        Source: OFFICIAL_DATA_SOURCE_REGISTER.md — S3 (VERIFIED ACCESSIBLE)
        Endpoint: https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH
        Filters: eventlist=FL (floods), alertlevel=orange|red for India
        """
        alerts = self._fetch_from_rest_api()
        if alerts is not None:
            return alerts

        logger.warning("GDACS REST API failed — attempting XML feed fallback")
        alerts = self._fetch_from_xml_feed()
        if alerts is not None:
            return alerts

        # Both sources failed — return empty list rather than a simulated alert.
        # Callers must handle an empty list gracefully.
        logger.error(
            "GDACS: both REST API and XML feed unavailable. "
            "No official alerts ingested this cycle."
        )
        return []

    # ------------------------------------------------------------------
    # Primary: GDACS REST API (GeoJSON/JSON)
    # ------------------------------------------------------------------

    def _fetch_from_rest_api(self) -> List[Dict[str, Any]]:
        """
        Fetch India-relevant flood and drought events via GDACS REST API.
        Returns list of alerts, or None on network/parse failure.
        """
        alerts = []
        # Query flood events at orange or red alert level
        for event_type, alert_type in [("FL", "flood"), ("DR", "drought")]:
            for alert_level in ("orange", "red"):
                params = {
                    "eventlist": event_type,
                    "alertlevel": alert_level,
                    "pagesize": 20,
                    "pagenumber": 1,
                }
                try:
                    resp = requests.get(
                        GDACS_REST_URL,
                        params=params,
                        timeout=REQUEST_TIMEOUT,
                        headers={"Accept": "application/json"},
                    )
                    if not resp.ok:
                        logger.warning(
                            f"GDACS REST API returned HTTP {resp.status_code} "
                            f"for eventtype={event_type}, level={alert_level}"
                        )
                        continue

                    data = resp.json()
                    features = data.get("features", [])

                    for feat in features:
                        props = feat.get("properties", {})
                        country = props.get("country", "") or ""
                        name = props.get("name", "") or ""
                        description = props.get("description", "") or ""

                        # Filter India-relevant events
                        combined = (country + name + description).lower()
                        if "india" not in combined:
                            continue

                        level = props.get("alertlevel", alert_level).lower()
                        if "red" in level:
                            sev = "critical"
                        elif "orange" in level:
                            sev = "high"
                        else:
                            sev = "medium"

                        event_id = props.get("eventid", "unknown")
                        iso_date = props.get("fromdate", "")
                        short_desc = description[:200] if description else name

                        alerts.append({
                            "alert_type": alert_type,
                            "severity": sev,
                            "message": (
                                f"GDACS OFFICIAL WARNING [{level.upper()}]: "
                                f"{name}. {short_desc}"
                            ),
                            "data_source": self.get_provider_name(),
                            "affected_locations": country or "India",
                        })

                except requests.exceptions.Timeout:
                    logger.warning(
                        f"GDACS REST API timeout for {event_type}/{alert_level}"
                    )
                except Exception as e:
                    logger.error(f"GDACS REST API error: {str(e)}")

        return alerts  # may be empty list if no India events found

    # ------------------------------------------------------------------
    # Secondary fallback: GDACS XML/RSS feed
    # ------------------------------------------------------------------

    def _fetch_from_xml_feed(self) -> List[Dict[str, Any]]:
        """
        Attempt legacy XML feed. Returns list (possibly empty) or None on failure.
        """
        try:
            import xml.etree.ElementTree as ET
            resp = requests.get(GDACS_XML_URL, timeout=REQUEST_TIMEOUT)
            if not resp.ok:
                return None

            root = ET.fromstring(resp.content)
            items = root.findall(".//item")
            alerts = []

            for item in items:
                title_elem = item.find("title")
                desc_elem = item.find("description")
                title = title_elem.text if title_elem is not None else ""
                desc = desc_elem.text if desc_elem is not None else ""

                country = ""
                severity = "Medium"
                for child in item:
                    if "country" in child.tag:
                        country = child.text or ""
                    if "severity" in child.tag:
                        severity = child.text or "Medium"

                if not (
                    "india" in country.lower()
                    or "india" in title.lower()
                    or "india" in (desc or "").lower()
                ):
                    continue

                sev_lower = severity.lower()
                if "high" in sev_lower or "red" in sev_lower:
                    sev = "critical"
                elif "medium" in sev_lower or "orange" in sev_lower:
                    sev = "high"
                else:
                    sev = "medium"

                alerts.append({
                    "alert_type": (
                        "flood"
                        if "flood" in title.lower() or "rain" in title.lower()
                        else "drought"
                    ),
                    "severity": sev,
                    "message": f"GDACS WARNING: {title}. {(desc or '')[:150]}",
                    "data_source": self.get_provider_name(),
                    "affected_locations": country or "India Catchment Region",
                })

            return alerts

        except Exception as e:
            logger.error(f"GDACS XML feed error: {str(e)}")
            return None
