"""LLM-specific exceptions for the KWeX application."""

from typing import Optional


class LLMError(Exception):
    """Base exception for LLM-related errors."""

    def __init__(self, message: str, model: Optional[str] = None):
        self.message = message
        self.model = model
        super().__init__(self.message)


class LLMConnectionError(LLMError):
    """Raised when unable to connect to the LLM service."""

    pass


class LLMRateLimitError(LLMError):
    """Raised when the LLM service rate limit is exceeded."""

    def __init__(
        self, message: str, model: Optional[str] = None, retry_after: Optional[int] = None
    ):
        super().__init__(message, model)
        self.retry_after = retry_after


class LLMInvalidResponseError(LLMError):
    """Raised when the LLM returns an invalid or unparseable response."""

    def __init__(
        self, message: str, model: Optional[str] = None, raw_response: Optional[str] = None
    ):
        super().__init__(message, model)
        self.raw_response = raw_response


class LLMAuthenticationError(LLMError):
    """Raised when authentication to the LLM service fails."""

    pass


class LLMTimeoutError(LLMError):
    """Raised when the LLM request times out."""

    def __init__(
        self, message: str, model: Optional[str] = None, timeout_seconds: Optional[float] = None
    ):
        super().__init__(message, model)
        self.timeout_seconds = timeout_seconds


class LLMContextLengthError(LLMError):
    """Raised when the input exceeds the model's context length."""

    def __init__(
        self,
        message: str,
        model: Optional[str] = None,
        token_count: Optional[int] = None,
        max_tokens: Optional[int] = None,
    ):
        super().__init__(message, model)
        self.token_count = token_count
        self.max_tokens = max_tokens


class LLMContentFilterError(LLMError):
    """Raised when content is blocked by the model's safety filters."""

    pass
