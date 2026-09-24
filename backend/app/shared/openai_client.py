"""
Thin wrapper around the OpenAI SDK - shared by Catch Up and Planner (both
call it directly). Readiness goes through LangChain's ChatOpenAI instead,
in app/readiness/agents/llm.py, since it needs LangGraph/LangSmith
integration - kept separate deliberately rather than forcing one
abstraction over two different calling conventions.
"""
import time
from dataclasses import dataclass

from openai import OpenAI

from app.shared.config import get_settings

settings = get_settings()
_client: OpenAI | None = None


def get_client() -> OpenAI:
    global _client
    if _client is None:
        _client = OpenAI(api_key=settings.openai_api_key)
    return _client


@dataclass
class LLMCallResult:
    text: str
    prompt_tokens: int
    completion_tokens: int
    total_tokens: int
    latency_ms: int
    model: str


def call_llm(system_prompt: str, user_prompt: str) -> LLMCallResult:
    client = get_client()
    model = settings.openai_model

    start = time.perf_counter()
    response = client.chat.completions.create(
        model=model,
        temperature=settings.openai_temperature,
        max_tokens=settings.openai_max_tokens,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
    )
    latency_ms = int((time.perf_counter() - start) * 1000)

    usage = response.usage
    text = response.choices[0].message.content or ""

    return LLMCallResult(
        text=text,
        prompt_tokens=usage.prompt_tokens if usage else 0,
        completion_tokens=usage.completion_tokens if usage else 0,
        total_tokens=usage.total_tokens if usage else 0,
        latency_ms=latency_ms,
        model=model,
    )
