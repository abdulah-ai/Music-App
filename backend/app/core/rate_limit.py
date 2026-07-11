from __future__ import annotations

import asyncio
import time
from collections import defaultdict, deque

from fastapi import HTTPException, Request, status


class InMemoryRateLimiter:
    """Small single-process sliding-window limiter for sensitive endpoints.

    Duskglen currently runs one API process. If it is scaled horizontally this
    can be replaced with Redis without changing endpoint behavior.
    """

    def __init__(self) -> None:
        self._attempts: dict[str, deque[float]] = defaultdict(deque)
        self._lock = asyncio.Lock()

    async def check(self, bucket: str, request: Request, limit: int, window_seconds: int) -> None:
        client = request.client.host if request.client else "unknown"
        key = f"{bucket}:{client}"
        now = time.monotonic()
        cutoff = now - window_seconds

        async with self._lock:
            attempts = self._attempts[key]
            while attempts and attempts[0] <= cutoff:
                attempts.popleft()
            if len(attempts) >= limit:
                retry_after = max(1, int(window_seconds - (now - attempts[0])))
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail="Too many attempts. Wait a moment and try again.",
                    headers={"Retry-After": str(retry_after)},
                )
            attempts.append(now)


auth_rate_limiter = InMemoryRateLimiter()
