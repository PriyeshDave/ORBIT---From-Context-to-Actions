"""
Unified configuration for Orbit. Merges what were three separate
config.py files (Catch Up, Planner, Readiness) into one - all three
capabilities share one OpenAI key, one CORS policy, one optional LangSmith
project. Field set is the union of all three originals so ported code
needs no changes to how it reads settings.
"""
from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # --- OpenAI ---
    openai_api_key: str = ""
    openai_model: str = "gpt-4o-mini"
    openai_temperature: float = 0.2
    openai_max_tokens: int = 900
    openai_orchestrator_model: str = "gpt-4o"  # used by the Readiness capability's coordinator

    # --- LangSmith (optional; every capability falls back gracefully if unset) ---
    langchain_tracing_v2: bool = False
    langchain_api_key: str = ""
    langchain_project: str = "orbit-demo"
    langchain_endpoint: str = "https://api.smith.langchain.com"

    # --- App / server ---
    backend_port: int = 8000
    cors_origins: str = "http://localhost:3000,http://127.0.0.1:3000,http://localhost:5173"
    app_env: str = "local"

    # --- Demo behavior ---
    simulate_llm_latency_ms: int = 0
    max_upload_mb: int = 10

    # --- Fallback pricing (used only if pricing.json doesn't cover a model) ---
    price_input_per_1k: float = 0.00015
    price_output_per_1k: float = 0.0006
    price_orchestrator_input_per_1k: float = 0.0025
    price_orchestrator_output_per_1k: float = 0.01

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def langsmith_enabled(self) -> bool:
        return bool(self.langchain_tracing_v2 and self.langchain_api_key)


@lru_cache
def get_settings() -> Settings:
    return Settings()
