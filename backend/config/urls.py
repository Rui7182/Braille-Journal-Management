"""
URL configuration for config project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/4.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""

from django.contrib import admin
from django.urls import path, include

# 登录与初始管理员必须在 api/ include 之前注册，否则会 404/405
from api.views import LoginView, InitAdminView

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/users/login/", LoginView.as_view(), name="api-auth-login"),
    path("api/auth/init_admin/", InitAdminView.as_view(), name="api-auth-init-admin"),
    path("api/", include("api.urls")),
    path("api/v1/", include("api.urls")),
]
