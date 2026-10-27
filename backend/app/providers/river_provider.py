import requests
from typing import Dict, Any
from app.providers.base_provider import BaseTelemetryProvider

class RiverProvider(BaseTelemetryProvider):
    def get_provider_name(self) -> str:
        return "Central Water Commission (CWC) River Gauges"

    def get_status_label(self, is_fallback: bool = False) -> str:
        return "Simulated" if is_fallback else "Live"

    def get_river_gauge(self, name: str, latitude: float, longitude: float, fallback_level: float, fallback_flow: float, fallback_trend: str) -> Dict[str, Any]:
        """
        Returns river gauge data.

        No public CWC REST API endpoint is available for real-time river gauge
        heights.  India-WRIS (indiawris.gov.in) provides river level data but
        requires user registration; access has not been verified for this project.

        All values returned here are derived from the rainfall-driven simulation
        in sync_service.py.  They are explicitly marked as Simulated and must not
        be presented as live CWC gauge readings.

        DATA INTEGRITY NOTE: A previous version of this provider returned hardcoded
        constants (8.45 m, 845.0 m³/s) for the Ganges River as "Live CWC gauge
        (Patna station)".  Those values were synthetic and have been removed.
        No fabricated measurements are returned as official data.
        """
        # No verified live CWC river gauge API is available.
        # Return the rainfall-driven simulation for all rivers.
        return {
            "river_level": fallback_level,
            "flow_rate": fallback_flow,
            "trend": fallback_trend,
            "data_source": "Simulated Telemetry",
            "data_status": self.get_status_label(is_fallback=True),
            "success": False,
        }
