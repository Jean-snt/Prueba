import logging

logger = logging.getLogger(__name__)


class CorsDebugMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        origin = request.META.get('HTTP_ORIGIN', 'N/A')
        method = request.method
        if method == 'OPTIONS' or origin != 'N/A':
            logger.info(
                f'[CORS DEBUG] {method} {request.path} '
                f'Origin={origin} '
                f'Referer={request.META.get("HTTP_REFERER", "N/A")}'
            )

        if method == 'OPTIONS':
            from django.http import HttpResponse
            response = HttpResponse(status=200)
            response['Access-Control-Allow-Origin'] = origin if origin != 'N/A' else '*'
            response['Access-Control-Allow-Methods'] = 'GET, POST, PUT, PATCH, DELETE, OPTIONS'
            response['Access-Control-Allow-Headers'] = 'accept, accept-encoding, authorization, content-type, dnt, origin, user-agent, x-csrftoken, x-requested-with'
            response['Access-Control-Allow-Credentials'] = 'true'
            response['Access-Control-Max-Age'] = '3600'
            return response

        response = self.get_response(request)
        return response
