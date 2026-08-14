from __future__ import annotations

from typing import Any

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse


class ApiError(Exception):
    def __init__(self, status_code: int, message: str, details: Any | None = None) -> None:
        super().__init__(message)
        self.status_code = status_code
        self.message = message
        self.details = details


def register_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(ApiError)
    async def handle_api_error(_: Request, error: ApiError) -> JSONResponse:
        payload = {"ok": False, "error": error.message}
        if error.details is not None:
            payload["details"] = error.details
        return JSONResponse(status_code=error.status_code, content=payload)

    @app.exception_handler(Exception)
    async def handle_unexpected_error(_: Request, error: Exception) -> JSONResponse:
        return JSONResponse(
            status_code=500,
            content={
                "ok": False,
                "error": "Internal server error",
                "details": str(error),
            },
        )
