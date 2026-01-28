"""LLM client services for KWeX."""

from app.services.llm.azure_foundry_client import (
    AzureClaudeClient,
    AzureOpenAIClient,
    get_llm_client,
)
from app.services.llm.base_client import BaseLLMClient, LLMMessage, LLMResponse
from app.services.llm.exceptions import (
    LLMAuthenticationError,
    LLMConnectionError,
    LLMContentFilterError,
    LLMContextLengthError,
    LLMError,
    LLMInvalidResponseError,
    LLMRateLimitError,
    LLMTimeoutError,
)
from app.services.llm.mock_llm_client import MockLLMClient

__all__ = [
    # Base classes
    "BaseLLMClient",
    "LLMMessage",
    "LLMResponse",
    # Implementations
    "AzureClaudeClient",
    "AzureOpenAIClient",
    "MockLLMClient",
    # Factory
    "get_llm_client",
    # Exceptions
    "LLMError",
    "LLMConnectionError",
    "LLMRateLimitError",
    "LLMInvalidResponseError",
    "LLMAuthenticationError",
    "LLMTimeoutError",
    "LLMContextLengthError",
    "LLMContentFilterError",
]
