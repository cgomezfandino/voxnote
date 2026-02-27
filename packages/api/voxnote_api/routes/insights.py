"""Insights extraction endpoint."""

from __future__ import annotations

import asyncio

from fastapi import APIRouter, HTTPException

from voxnote_api.schemas import InsightsRequest, InsightsResponse

router = APIRouter()


@router.post("/insights", response_model=InsightsResponse)
async def extract_insights_endpoint(
    request: InsightsRequest,
) -> InsightsResponse:
    """Extract structured insights from transcript text."""
    try:
        from voxnote.pipeline.insights import extract_insights

        result = await asyncio.to_thread(
            extract_insights,
            request.text,
            provider_name=request.provider,
        )

        return InsightsResponse(**result)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Insight extraction failed: {e}"
        ) from e
