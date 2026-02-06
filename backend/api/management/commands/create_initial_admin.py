"""
创建初始管理员账号（若尚未存在任何管理员）。
用法: python manage.py create_initial_admin
默认账号: 手机号 13800138000，密码 Admin123456
"""
from django.core.management.base import BaseCommand
from django.contrib.auth.hashers import make_password
from django.utils import timezone
from api.models import Users


# 默认初始管理员（可在此修改）
DEFAULT_PHONE = '13800138000'
DEFAULT_PASSWORD = 'Admin123456'
DEFAULT_NAME = '管理员'


class Command(BaseCommand):
    help = '创建初始管理员账号（手机号 13800138000，密码 Admin123456）'

    def handle(self, *args, **options):
        if Users.objects.filter(role_type=3).exists():
            self.stdout.write(self.style.WARNING('系统中已存在管理员，跳过创建。'))
            return
        if Users.objects.filter(phone=DEFAULT_PHONE).exists():
            self.stdout.write(self.style.WARNING(f'手机号 {DEFAULT_PHONE} 已存在，跳过创建。'))
            return
        Users.objects.create(
            username=DEFAULT_PHONE,
            phone=DEFAULT_PHONE,
            real_name=DEFAULT_NAME,
            role_type=3,
            status=1,
            password_hash=make_password(DEFAULT_PASSWORD),
            created_at=timezone.now(),
        )
        self.stdout.write(self.style.SUCCESS(
            f'已创建初始管理员：手机号 {DEFAULT_PHONE}，密码 {DEFAULT_PASSWORD}。请登录后及时修改密码。'
        ))
