"""
api 鉴权：同时支持
- CustomJWTAuthentication：用户端 JWT，从 token 取 user_id 查自定义 Users，需带 Bearer token。
- ApiAllowAnyAuthentication：管理后台等不传 token 的请求也放行，避免 401。
"""
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, AuthenticationFailed

# 优先 common.models.Users，若无则用 api.models.Users（兼容合并项目与当前项目）
try:
    from common.models import Users as CustomUsers
except ImportError:
    from api.models import Users as CustomUsers


class CustomJWTAuthentication(JWTAuthentication):
    """用户端 JWT：用 token 里的 user_id 查自定义 Users 模型。"""
    def get_user(self, validated_token):
        try:
            user_id = validated_token['user_id']
        except KeyError:
            raise InvalidToken('Token 不包含 user_id')
        try:
            user = CustomUsers.objects.get(id=user_id)
        except CustomUsers.DoesNotExist:
            raise AuthenticationFailed('用户不存在', code='user_not_found')
        if getattr(user, 'status', 1) != 1:
            raise AuthenticationFailed('用户已被封禁', code='user_inactive')
        return user


class _FakeApiUser:
    """占位用户：仅用于通过 DRF 的 IsAuthenticated 检查，避免 500。"""
    is_authenticated = True
    is_anonymous = False
    pk = 0
    id = 0


class ApiAllowAnyAuthentication:
    """管理后台用：不校验凭证，任意请求都视为已认证，避免 401。"""
    def authenticate(self, request):
        try:
            from django.contrib.auth import get_user_model
            from django.contrib.auth.hashers import make_password
            User = get_user_model()
            user, _ = User.objects.get_or_create(
                username='api_internal',
                defaults={
                    'is_staff': False,
                    'is_active': True,
                    'is_superuser': False,
                    'password': make_password('api_internal_no_login'),
                }
            )
            return (user, None)
        except Exception:
            return (_FakeApiUser(), None)

    def authenticate_header(self, request):
        return 'ApiAllowAny'
