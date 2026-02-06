"""
在服务器上重置指定管理员/用户的登录密码（用于管理员账号丢失时恢复）。
用法:
  python manage.py reset_admin_password --phone 13800138000 --password 新密码
  python manage.py reset_admin_password -p 13800138000 -w NewPass123
"""
from django.core.management.base import BaseCommand
from django.contrib.auth.hashers import make_password
from api.models import Users


class Command(BaseCommand):
    help = '按手机号重置用户登录密码（管理员账号丢失时使用）'

    def add_arguments(self, parser):
        parser.add_argument(
            '--phone', '-p',
            type=str,
            required=True,
            help='要重置密码的用户手机号',
        )
        parser.add_argument(
            '--password', '-w',
            type=str,
            required=True,
            help='新密码（至少6位）',
        )

    def handle(self, *args, **options):
        phone = (options['phone'] or '').strip()
        password = (options['password'] or '').strip()
        if not phone:
            self.stdout.write(self.style.ERROR('请提供手机号：--phone 或 -p'))
            return
        if len(password) < 6:
            self.stdout.write(self.style.ERROR('新密码至少需要 6 位。'))
            return
        try:
            user = Users.objects.get(phone=phone)
        except Users.DoesNotExist:
            self.stdout.write(self.style.ERROR(f'未找到手机号为 {phone} 的用户。'))
            return
        user.password_hash = make_password(password)
        user.save(update_fields=['password_hash'])
        self.stdout.write(self.style.SUCCESS(
            f'已重置用户 {phone} 的登录密码，请使用新密码登录。'
        ))
