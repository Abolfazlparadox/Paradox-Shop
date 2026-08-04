import logging

class SensitiveDataFilter(logging.Filter):
    """
    Filter to prevent logging passwords, access tokens, and credit card credentials.
    """
    SENSITIVE_KEYS = {'password', 'token', 'secret', 'authorization', 'card_number', 'cvv'}

    def filter(self, record):
        if isinstance(record.msg, dict):
            for key in self.SENSITIVE_KEYS:
                if key in record.msg:
                    record.msg[key] = '***REDACTED***'
        return True

def setup_logger(name: str):
    logger = logging.getLogger(name)
    logger.addFilter(SensitiveDataFilter())
    return logger
