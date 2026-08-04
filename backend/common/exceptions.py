from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status
import logging

logger = logging.getLogger(__name__)

def custom_exception_handler(exc, context):
    response = exception_handler(exc, context)

    if response is not None:
        custom_response_data = {
            'error': {
                'code': exc.__class__.__name__,
                'message': response.data.get('detail', 'A validation or API error occurred.'),
                'details': response.data if 'detail' not in response.data else None
            }
        }
        response.data = custom_response_data
    else:
        logger.error(f"Unhandled system exception: {exc}", exc_info=True, extra={'context': str(context)})
        response = Response({
            'error': {
                'code': 'InternalServerError',
                'message': 'An unexpected system error occurred. Please try again later.'
            }
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    return response
