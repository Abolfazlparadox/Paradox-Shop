from rest_framework.views import APIView
from rest_framework.response import Response

class UsersHealthCheckView(APIView):
    """
    Module health check endpoint.
    """
    def get(self, request):
        return Response({'module': 'users', 'status': 'initialized'})
