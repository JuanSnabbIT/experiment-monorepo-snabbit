import os
from channels.routing import ProtocolTypeRouter
from django.core.asgi import get_asgi_application
from channels.auth import AuthMiddlewareStack
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.security.websocket import AllowedHostsOriginValidator

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'sw_erp.settings')
django_asgi_app = get_asgi_application()



application = ProtocolTypeRouter({
    'http': django_asgi_app,
    # 'websocket': AllowedHostsOriginValidator(
    #     AuthMiddlewareStack(
    #         URLRouter(
    #         )
    #     )
    # ),
})