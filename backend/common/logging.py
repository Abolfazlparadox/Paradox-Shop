import logging


class SensitiveDataFilter(logging.Filter):
    """
    Logging filter that redacts sensitive fields from log records.
    Prevents passwords, tokens, and credentials from leaking into log output.
    """

    SENSITIVE_KEYS = {
        "password",
        "token",
        "secret",
        "authorization",
        "card_number",
        "cvv",
        "refresh",
        "access",
        "api_key",
    }

    def filter(self, record):
        if isinstance(record.msg, dict):
            for key in list(record.msg.keys()):
                if any(sensitive in key.lower() for sensitive in self.SENSITIVE_KEYS):
                    record.msg[key] = "***REDACTED***"
        if hasattr(record, "args") and isinstance(record.args, dict):
            for key in list(record.args.keys()):
                if any(sensitive in key.lower() for sensitive in self.SENSITIVE_KEYS):
                    record.args[key] = "***REDACTED***"
        return True


class RequestIDFilter(logging.Filter):
    """
    Logging filter that adds the current request ID to every log record.
    Works with the RequestIDMiddleware to correlate log entries.
    """

    def filter(self, record):
        from common.middleware import get_request_id

        record.request_id = get_request_id()
        return True


def get_logger(name: str) -> logging.Logger:
    """Returns a logger with the application's standard configuration."""
    return logging.getLogger(name)
