from django.contrib import admin
from .models import (
    Articles, Periodicals, Users, Categories,
    ArticleStats, VolunteerProfiles, AuditLogs,
    ContentVersions, Downloads, Favorites, AccessApplications
)

# 注册模型到Django Admin（只读模式，因为managed=False）
@admin.register(Articles)
class ArticlesAdmin(admin.ModelAdmin):
    list_display = ['id', 'title', 'author_original', 'status', 'periodical', 'created_at']
    list_filter = ['status', 'periodical', 'category']
    search_fields = ['title', 'author_original']
    readonly_fields = ['id', 'created_at']

@admin.register(Periodicals)
class PeriodicalsAdmin(admin.ModelAdmin):
    list_display = ['id', 'title', 'year', 'issue_no', 'status', 'article_count']
    list_filter = ['status', 'year']
    search_fields = ['title']
    readonly_fields = ['id']

@admin.register(Users)
class UsersAdmin(admin.ModelAdmin):
    list_display = ['id', 'username', 'real_name', 'phone', 'role_type', 'status']
    list_filter = ['role_type', 'status']
    search_fields = ['username', 'real_name', 'phone']
    readonly_fields = ['id', 'created_at', 'last_login_at']

@admin.register(Categories)
class CategoriesAdmin(admin.ModelAdmin):
    list_display = ['id', 'name', 'sort_order', 'is_active']
    list_filter = ['is_active']
    search_fields = ['name']
