import logging

import redis
from django.conf import settings
from django.db import connection
from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

logger = logging.getLogger(__name__)


@extend_schema(tags=["Health"])
class LivenessHealthCheckView(APIView):
    """
    Lightweight liveness probe.
    Returns 200 OK as long as the application process is running and responding.
    """

    authentication_classes = []
    permission_classes = []

    def get(self, request):
        return Response({"status": "alive"}, status=status.HTTP_200_OK)


@extend_schema(tags=["Health"])
class ReadinessHealthCheckView(APIView):
    """
    Readiness probe verifying DB and Redis dependencies.
    Returns 200 OK when ready to accept traffic, 503 if any dependency fails.
    """

    authentication_classes = []
    permission_classes = []

    def get(self, request):
        db_status = "ok"
        redis_status = "ok"
        is_ready = True

        # Check PostgreSQL
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
        except Exception as e:
            logger.error("Readiness check DB failure: %s", e)
            db_status = "unhealthy"
            is_ready = False

        # Check Redis
        try:
            r = redis.Redis.from_url(settings.REDIS_URL, socket_timeout=2)
            r.ping()
        except Exception as e:
            logger.warning("Readiness check Redis failure: %s", e)
            redis_status = "unhealthy"
            is_ready = False

        response_code = status.HTTP_200_OK if is_ready else status.HTTP_503_SERVICE_UNAVAILABLE

        return Response(
            {
                "status": "ready" if is_ready else "not_ready",
                "services": {
                    "database": db_status,
                    "redis": redis_status,
                },
            },
            status=response_code,
        )


@extend_schema(tags=["Health"])
class SystemHealthCheckView(ReadinessHealthCheckView):
    """
    Backwards-compatible full system health check endpoint.
    """

    pass
