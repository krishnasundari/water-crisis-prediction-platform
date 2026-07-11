from abc import ABC, abstractmethod
from typing import Dict, Any, List

class BaseTelemetryProvider(ABC):
    """Base interface for all telemetry data providers (Dams, Rivers, Weather, Alerts)"""
    
    @abstractmethod
    def get_provider_name(self) -> str:
        """Returns the name of the telemetry data source"""
        pass
        
    @abstractmethod
    def get_status_label(self) -> str:
        """Returns whether this provider is 'Live', 'Estimated', or 'Simulated'"""
        pass
