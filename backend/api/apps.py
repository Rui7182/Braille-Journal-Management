from django.apps import AppConfig


class ApiConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "api"

    def ready(self):
        """应用启动时：若系统中尚无任何管理员，则自动创建初始管理员账号。"""
        try:
            from django.contrib.auth.hashers import make_password
            from django.utils import timezone
            from .models import Users
            if Users.objects.filter(role_type=3).exists():
                return
            if Users.objects.filter(phone='13800138000').exists():
                return
            Users.objects.create(
                username='13800138000',
                phone='13800138000',
                real_name='管理员',
                role_type=3,
                status=1,
                password_hash=make_password('Admin123456'),
                created_at=timezone.now(),
            )
        except Exception:
            pass  # 表未创建或数据库未就绪时忽略
