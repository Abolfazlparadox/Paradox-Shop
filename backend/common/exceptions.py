import logging

from rest_framework import status
from rest_framework.exceptions import APIException
from rest_framework.response import Response
from rest_framework.views import exception_handler

logger = logging.getLogger(__name__)


class BusinessLogicError(APIException):
    """Base exception for business rule violations."""

    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = "A business rule violation occurred."
    default_code = "business_error"


class InsufficientStockError(BusinessLogicError):
    """Raised when requested inventory is unavailable."""

    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = "Insufficient stock for one or more requested items."
    default_code = "insufficient_stock"


class InvalidStateTransitionError(BusinessLogicError):
    """Raised when an invalid lifecycle state transition is attempted."""

    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = "The requested status transition is not permitted."
    default_code = "invalid_state_transition"


def custom_exception_handler(exc, context):
    """
    Standardized API exception handler.
    Ensures all error responses follow a consistent contract:
    {
        "error": {
            "code": "ValidationError" / "BusinessLogicError" / etc.,
            "message": "Human readable summary",
            "details": { ...field errors or detail payload... }
        }
    }
    """
    response = exception_handler(exc, context)

    if response is not None:
        message = "A validation or API error occurred."
        details = response.data

        if isinstance(response.data, dict):
            if "detail" in response.data:
                message = str(response.data["detail"])
                details = None
            elif len(response.data) == 1 and "non_field_errors" in response.data:
                err_list = response.data["non_field_errors"]
                message = (
                    str(err_list[0]) if isinstance(err_list, list) and err_list else str(err_list)
                )
                details = None
        elif isinstance(response.data, list) and len(response.data) > 0:
            message = str(response.data[0])
            details = response.data

        custom_response_data = {
            "error": {
                "code": getattr(exc, "default_code", exc.__class__.__name__),
                "message": message,
                "details": details,
            }
        }
        response.data = custom_response_data
    else:
        logger.error(
            "Unhandled system exception: %s",
            exc,
            exc_info=True,
            extra={"context": str(context)},
        )
        response = Response(
            {
                "error": {
                    "code": "InternalServerError",
                    "message": "An unexpected system error occurred. Please try again later.",
                    "details": None,
                }
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    return response
