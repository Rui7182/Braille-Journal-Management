from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    ArticleViewSet, PeriodicalViewSet, UserViewSet,
    CategoryViewSet, DashboardViewSet, SearchViewSet, NotificationViewSet,
    AccessApplicationViewSet,
    LoginView,
    InitAdminView,
)

# 登录与初始管理员必须写在 router 之前，否则 users/login 会被当作 pk 导致 405
auth_urlpatterns = [
    path('users/login/', LoginView.as_view(), name='auth-login'),
    path('auth/init_admin/', InitAdminView.as_view(), name='auth-init-admin'),
]

router = DefaultRouter()
router.register(r'articles', ArticleViewSet, basename='article')
router.register(r'periodicals', PeriodicalViewSet, basename='periodical')
router.register(r'users', UserViewSet, basename='user')
router.register(r'categories', CategoryViewSet, basename='category')
router.register(r'dashboard', DashboardViewSet, basename='dashboard')
router.register(r'search', SearchViewSet, basename='search')
router.register(r'notifications', NotificationViewSet, basename='notification')
router.register(r'access-applications', AccessApplicationViewSet, basename='access-application')

urlpatterns = auth_urlpatterns + [path('', include(router.urls))]
