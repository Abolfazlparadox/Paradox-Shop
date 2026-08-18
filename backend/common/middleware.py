import threading
import uuid

from django.utils.deprecation import MiddlewareMixin

_request_id = threading.local()


def get_request_id() -> str:
    """Returns the current request ID, or '-' if none is set."""
    return getattr(_request_id, "value", "-")


class RequestIDMiddleware(MiddlewareMixin):
    """
    Middleware that assigns a unique request ID (UUID4) to every HTTP request.

    The request ID is:
    - Stored in thread-local storage for use by the logging filter.
    - Attached to the request object as `request.id`.
    - Included in the response header `X-Request-ID`.
    """

    def process_request(self, request):
        request_id = request.META.get("HTTP_X_REQUEST_ID", str(uuid.uuid4()))
        _request_id.value = request_id
        request.id = request_id

    def process_response(self, request, response):
        request_id = getattr(request, "id", get_request_id())
        response["X-Request-ID"] = request_id
        return response
