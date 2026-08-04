from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.db import connection
import redis
from django.conf import settings
import logging

logger = logging.getLogger(__name__)

class SystemHealthCheckView(APIView):
    """
    Production-grade system health check endpoint.
    Performs checks for Database and Redis connectivity without leaking sensitive specs.
    """
    authentication_classes = []
    permission_classes = []

    def get(self, request):
        db_status = "ok"
        redis_status = "ok"
        overall_status = "healthy"

        # Check PostgreSQL
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
        except Exception as e:
            logger.error(f"Health check DB failure: {e}")
            db_status = "unhealthy"
            overall_status = "degraded"

        # Check Redis
        try:
            r = redis.Redis.from_url(settings.REDIS_URL, socket_timeout=2)
            r.ping()
        except Exception as e:
            logger.warning(f"Health check Redis failure: {e}")
            redis_status = "unhealthy"
            overall_status = "degraded"

        response_code = status.HTTP_200_OK if overall_status == "healthy" else status.HTTP_503_SERVICE_UNAVAILABLE

        return Response({
            "status": overall_status,
            "services": {
                "database": db_status,
                "redis": redis_status,
            }
        }, status=response_code)
