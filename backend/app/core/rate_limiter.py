"""
In-Memory Rate Limiter Module
=============================
Provides a lightweight sliding-window rate limiter for sensitive authentication
and mutating endpoints without introducing external Redis infrastructure dependencies.
"""

import time
import logging
from collections import defaultdict
from typing import Dict, List, Optional
from fastapi import Request, HTTPException, status

logger = logging.getLogger(__name__)


class InMemoryRateLimiter:
    """
    Sliding window in-memory rate limiter per IP address.
    """
    def __init__(self, requests_limit: int = 15, window_seconds: int = 60, name: str = "default"):
        self.requests_limit = requests_limit
        self.window_seconds = window_seconds
        self.name = name
        self.requests: Dict[str, List[float]] = defaultdict(list)

    def _get_client_ip(self, request: Request) -> str:
        """Extract client IP, inspecting X-Forwarded-For if available"""
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            # Take the first client IP in chain
            return forwarded.split(",")[0].strip()
        return request.client.host if request.client else "127.0.0.1"

    def check(self, request: Request) -> None:
        """
        Evaluate rate limit for the requesting client.
        Raises HTTP 429 if the limit has been exceeded.
        """
        now = time.time()
        client_ip = self._get_client_ip(request)
        cutoff = now - self.window_seconds

        # Clean timestamps older than the sliding window
        active_timestamps = [ts for ts in self.requests[client_ip] if ts > cutoff]
        self.requests[client_ip] = active_timestamps

        if len(active_timestamps) >= self.requests_limit:
            retry_after = int(self.window_seconds - (now - active_timestamps[0])) + 1
            retry_after = max(1, retry_after)
            logger.warning(
                f"Rate limit exceeded on [{self.name}] for IP {client_ip}: "
                f"{len(active_timestamps)}/{self.requests_limit} requests in {self.window_seconds}s"
            )
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Too many requests. Please wait {retry_after} seconds before retrying.",
                headers={"Retry-After": str(retry_after)},
            )

        self.requests[client_ip].append(now)

    def reset(self) -> None:
        """Reset all tracked client requests (useful for test suites)"""
        self.requests.clear()


# Pre-configured rate limiters for authentication endpoints
auth_rate_limiter = InMemoryRateLimiter(
    requests_limit=20,
    window_seconds=60,
    name="auth_login_register"
)

password_reset_rate_limiter = InMemoryRateLimiter(
    requests_limit=10,
    window_seconds=60,
    name="auth_password_reset"
)
