"""Kimi (Moonshot AI) provider for insight extraction."""

import json
import os

from rich.console import Console

from voxnote.providers.base import LLMProvider

console = Console()

SYSTEM_PROMPT = """\
你是一个专门分析会议记录的助手。提取结构化的见解，仅用JSON格式回复，不要使用markdown或代码块。
"""

USER_PROMPT_TEMPLATE = """\
分析这段会议记录，用以下JSON结构回复：

{{
  "resumen": "3-5句话的执行摘要",
  "decisiones": ["做出的决定列表"],
  "action_items": [
    {{"tarea": "描述", "responsable": "负责人或待定", "deadline": "日期或待定"}}
  ],
  "insights": ["关键观察或要点"],
  "preguntas_abiertas": ["未解决的问题"],
  "proximos_pasos": ["商定的后续步骤"]
}}

会议记录：
{transcript}
"""

MAX_TRANSCRIPT_CHARS = 8000


class KimiProvider(LLMProvider):
    """Kimi (Moonshot AI) provider."""

    def __init__(self):
        self.api_key = os.getenv("KIMI_API_KEY") or os.getenv("MOONSHOT_API_KEY")
        if not self.api_key:
            raise ValueError("KIMI_API_KEY or MOONSHOT_API_KEY environment variable not set")

        self.model = os.getenv("KIMI_MODEL", "moonshot-v1-8k")
        self.base_url = "https://api.moonshot.cn/v1"

    @property
    def name(self) -> str:
        return f"Kimi ({self.model})"

    @property
    def supports_streaming(self) -> bool:
        return True

    def extract_insights(self, transcript: str) -> dict:
        """Extract insights using Kimi API."""
        try:
            from openai import OpenAI
        except ImportError:
            raise ImportError(
                "openai package required for Kimi. Install with: pip install openai"
            )

        console.print(f"[bold blue]Extracting insights[/] with {self.name}…")

        client = OpenAI(api_key=self.api_key, base_url=self.base_url)

        response = client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {
                    "role": "user",
                    "content": USER_PROMPT_TEMPLATE.format(
                        transcript=transcript[:MAX_TRANSCRIPT_CHARS]
                    ),
                },
            ],
            temperature=0.1,
        )

        raw = response.choices[0].message.content
        # Kimi might wrap in markdown
        raw = raw.strip().strip("```json").strip("```").strip()
        data: dict = json.loads(raw)
        console.print("[green]Insights extracted[/]")
        return data
