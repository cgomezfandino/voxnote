"""GLM (Zhipu AI) provider for insight extraction."""

import json
import os

from rich.console import Console

from voxnote.providers.base import LLMProvider, build_transcript_section

console = Console()

USER_PROMPT_TEMPLATE = """\
请分析这段会议记录，并以JSON格式返回结构化的见解。不要使用markdown代码块，只返回纯JSON。

要求的JSON结构：
{{
  "resumen": "3-5句话的执行摘要",
  "decisiones": ["做出的决定列表"],
  "action_items": [
    {{"tarea": "任务描述", "responsable": "负责人或待定", "deadline": "截止日期或待定"}}
  ],
  "insights": ["关键洞察或重点"],
  "preguntas_abiertas": ["未解决的问题"],
  "proximos_pasos": ["商定的下一步"]
}}

会议记录：
{transcript_section}
"""

MAX_TRANSCRIPT_CHARS = 8000


class GLMProvider(LLMProvider):
    """GLM (Zhipu AI) provider."""

    def __init__(self):
        self.api_key = os.getenv("GLM_API_KEY") or os.getenv("ZHIPUAI_API_KEY")
        if not self.api_key:
            raise ValueError("GLM_API_KEY or ZHIPUAI_API_KEY environment variable not set")

        self.model = os.getenv("GLM_MODEL", "glm-4")
        self.base_url = os.getenv("GLM_BASE_URL", "https://open.bigmodel.cn/api/paas/v4")

    @property
    def name(self) -> str:
        return f"GLM ({self.model})"

    @property
    def supports_streaming(self) -> bool:
        return True

    def extract_insights(self, transcript: str) -> dict:
        """Extract insights using GLM API."""
        try:
            from zhipuai import ZhipuAI
        except ImportError:
            raise ImportError(
                "zhipuai package not installed. Install with: pip install zhipuai"
            )

        console.print(f"[bold blue]Extracting insights[/] with {self.name}…")

        client = ZhipuAI(api_key=self.api_key, base_url=self.base_url)

        response = client.chat.completions.create(
            model=self.model,
            messages=[
                {
                    "role": "user",
                    "content": USER_PROMPT_TEMPLATE.format(
                        transcript_section=build_transcript_section(
                            transcript[:MAX_TRANSCRIPT_CHARS], lang="zh"
                        )
                    ),
                }
            ],
            temperature=0.1,
        )

        raw = response.choices[0].message.content
        raw = raw.strip().strip("```json").strip("```").strip()
        data: dict = json.loads(raw)
        console.print("[green]Insights extracted[/]")
        return data
