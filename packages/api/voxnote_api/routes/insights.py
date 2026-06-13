"""Insights extraction endpoint."""

from __future__ import annotations

import asyncio
import logging

from fastapi import APIRouter, HTTPException
from pydantic import ValidationError

from voxnote_api.schemas import InsightsRequest, InsightsResponse

router = APIRouter()
logger = logging.getLogger("voxnote_api")


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
    except ValidationError as e:
        # ValidationError subclasses ValueError in Pydantic v2; catch it FIRST so its
        # message (which echoes input_value with transcript-derived content) never reaches
        # the client. The transcript was valid — this is a malformed-LLM-output server issue.
        logger.exception("Insights response failed validation")
        raise HTTPException(
            status_code=500, detail="Insight extraction produced malformed output."
        ) from e
    except ValueError as e:
        # Provider-side issues (e.g. unparseable JSON from the LLM). Log the detail
        # server-side; return a generic message so we never leak internals to the client.
        logger.warning("Insights extraction error: %s", e)
        raise HTTPException(
            status_code=400, detail="Insight extraction failed (invalid provider response)."
        ) from e
    except Exception as e:
        logger.exception("Insights extraction failed")
        raise HTTPException(
            status_code=500,
            detail="Insight extraction failed. Check server logs for details.",
        ) from e
