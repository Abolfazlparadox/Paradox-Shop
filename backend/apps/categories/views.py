from rest_framework.views import APIView
from rest_framework.response import Response

class CategoriesHealthCheckView(APIView):
    """
    Module health check endpoint.
    """
    def get(self, request):
        return Response({'module': 'categories', 'status': 'initialized'})
