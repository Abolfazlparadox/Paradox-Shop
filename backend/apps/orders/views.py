from rest_framework.views import APIView
from rest_framework.response import Response

class OrdersHealthCheckView(APIView):
    """
    Module health check endpoint.
    """
    def get(self, request):
        return Response({'module': 'orders', 'status': 'initialized'})
