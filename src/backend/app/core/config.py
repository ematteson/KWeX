"""Application configuration settings."""

import os
from functools import lru_cache
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict


def _parse_bool_env(var_name: str, default: bool) -> bool:
    """Parse a boolean environment variable."""
    val = os.environ.get(var_name, "").lower()
    if val in ("true", "1", "yes"):
        return True
    elif val in ("false", "0", "no"):
        return False
    return default


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Application
    app_name: str = "KWeX API"
    debug: bool = False
    api_v1_prefix: str = "/api/v1"

    # Database
    database_url: str = "sqlite:///./kwex.db"

    # Faethm API
    faethm_api_url: str = ""
    faethm_api_key: str = ""
    faethm_api_mock: bool = True  # Use mock data for MVP

    # Privacy settings
    min_respondents_for_display: int = 7

    # Survey settings
    max_survey_completion_minutes: int = 7

    # Azure Foundry - Anthropic (Claude) endpoint
    azure_anthropic_endpoint: str = "https://mingl-me834zz4-eastus2.services.ai.azure.com"
    azure_anthropic_api_key: str = ""  # From env: AZURE_ANTHROPIC_API_KEY
    azure_anthropic_deployment: str = "claude-sonnet-4-5"  # Deployment name for Claude

    # Azure Foundry - OpenAI endpoint
    azure_openai_endpoint: str = "https://mingl-me834zz4-eastus2.cognitiveservices.azure.com"
    azure_openai_api_key: str = ""  # From env: AZURE_OPENAI_API_KEY
    azure_openai_api_version: str = "2025-04-01-preview"
    azure_openai_deployment: str = "gpt-4o"  # Deployment name for GPT

    # LLM settings
    llm_mock: bool = True  # Use mock LLM for development
    llm_default_model: Literal["claude", "gpt"] = "claude"  # Default model to use
    llm_temperature: float = 0.7
    llm_max_tokens: int = 2000
    question_cache_min_quality: float = 0.7  # Minimum quality score to cache a question


def _clear_settings_cache():
    """Clear the settings cache (useful for testing)."""
    get_settings.cache_clear()


@lru_cache
def get_settings() -> Settings:
    """Get cached settings instance.

    Note: Also checks for env vars directly to handle cases where
    pydantic doesn't properly parse boolean values.
    """
    settings = Settings()

    # Override with direct env var checks for boolean values
    # This handles cases where pydantic doesn't parse "false" correctly
    if os.environ.get("FAETHM_API_MOCK", "").lower() in ("false", "0", "no"):
        object.__setattr__(settings, "faethm_api_mock", False)
    if os.environ.get("LLM_MOCK", "").lower() in ("false", "0", "no"):
        object.__setattr__(settings, "llm_mock", False)

    return settings
