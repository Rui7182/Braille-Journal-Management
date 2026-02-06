from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny
from .authentication import ApiAllowAnyAuthentication
from django.db import connection
from django.db.models import Q, Count, F
from django.contrib.auth.hashers import check_password, make_password
from .models import (
    Articles, Periodicals, Users, Categories,
    ArticleStats, VolunteerProfiles, AccessApplications, Messages, AuditLogs
)
from .services.doubao import generate_ai_summary
from .serializers import (
    ArticleSerializer, PeriodicalSerializer, UserSerializer,
    CategorySerializer, ArticleStatsSerializer, VolunteerProfileSerializer,
    AccessApplicationSerializer
)
import logging
from datetime import datetime
from django.utils import timezone
import pandas as pd
import io

logger = logging.getLogger(__name__)


def _do_login(user):
    """执行登录成功后的逻辑：更新 last_login_at，返回序列化用户信息"""
    user.last_login_at = timezone.now()
    user.save(update_fields=['last_login_at'])
    serializer = UserSerializer(user)
    data = serializer.data
    data['token'] = f'user_{user.id}'
    return data


class LoginView(APIView):
    authentication_classes = [ApiAllowAnyAuthentication]
    permission_classes = [AllowAny]
    """
    独立登录接口（避免被 router 的 detail 把 login 当成 pk）。
    POST /api/users/login/  body: { "phone": "", "password": "" }
    """
    def post(self, request):
        phone = (request.data.get('phone') or '').strip()
        password = request.data.get('password') or ''
        if not phone:
            return Response(
                {'error': '请输入手机号', 'detail': '手机号不能为空'},
                status=status.HTTP_400_BAD_REQUEST
            )
        if not password:
            return Response(
                {'error': '请输入密码', 'detail': '密码不能为空'},
                status=status.HTTP_400_BAD_REQUEST
            )
        try:
            user = Users.objects.get(phone=phone)
        except Users.DoesNotExist:
            return Response(
                {'error': '手机号或密码错误', 'detail': '未找到该手机号对应的用户'},
                status=status.HTTP_401_UNAUTHORIZED
            )
        if user.status != 1:
            return Response(
                {'error': '账号已被禁用', 'detail': '该账号已被禁用，请联系管理员'},
                status=status.HTTP_403_FORBIDDEN
            )
        stored = user.password_hash or ''
        if stored.startswith('pbkdf2_') or stored.startswith('bcrypt') or stored.startswith('argon2'):
            if not check_password(password, stored):
                return Response(
                    {'error': '手机号或密码错误', 'detail': '密码不正确'},
                    status=status.HTTP_401_UNAUTHORIZED
                )
        else:
            if stored != password:
                return Response(
                    {'error': '手机号或密码错误', 'detail': '密码不正确'},
                    status=status.HTTP_401_UNAUTHORIZED
                )
        return Response(_do_login(user))


class InitAdminView(APIView):
    authentication_classes = [ApiAllowAnyAuthentication]
    permission_classes = [AllowAny]
    """
    首次使用创建初始管理员。仅当系统中没有任何管理员时可调用。
    POST /api/auth/init_admin/  body: { "phone": "", "password": "", "name": "" }
    """
    def post(self, request):
        if Users.objects.filter(role_type=3).exists():
            return Response(
                {'error': '已有管理员', 'detail': '系统中已存在管理员，请直接使用手机号与密码登录'},
                status=status.HTTP_403_FORBIDDEN
            )
        phone = (request.data.get('phone') or '').strip()
        password = request.data.get('password') or ''
        name = (request.data.get('name') or '').strip() or '管理员'
        if not phone:
            return Response(
                {'error': '请填写手机号', 'detail': '手机号不能为空'},
                status=status.HTTP_400_BAD_REQUEST
            )
        if not password or len(password) < 6:
            return Response(
                {'error': '请设置至少6位密码', 'detail': '初始密码至少6位'},
                status=status.HTTP_400_BAD_REQUEST
            )
        if Users.objects.filter(phone=phone).exists():
            return Response(
                {'error': '该手机号已注册', 'detail': '请换一个手机号或直接登录'},
                status=status.HTTP_400_BAD_REQUEST
            )
        user = Users.objects.create(
            username=phone,
            phone=phone,
            real_name=name,
            role_type=3,
            status=1,
            password_hash=make_password(password),
            created_at=timezone.now()
        )
        return Response(_do_login(user), status=status.HTTP_201_CREATED)

    def get(self, request):
        """查询是否允许创建初始管理员（是否尚无管理员）"""
        can_init = not Users.objects.filter(role_type=3).exists()
        return Response({'can_init': can_init})


class ArticleViewSet(viewsets.ModelViewSet):
    authentication_classes = [ApiAllowAnyAuthentication]
    permission_classes = [AllowAny]
    queryset = Articles.objects.select_related('periodical', 'category').all()
    serializer_class = ArticleSerializer
    
    def update(self, request, *args, **kwargs):
        """更新文章，提供更详细的错误信息"""
        try:
            return super().update(request, *args, **kwargs)
        except Exception as e:
            logger.error(f"更新文章失败: {str(e)}", exc_info=True)
            return Response({
                'error': str(e),
                'detail': '更新文章时发生错误，请检查数据格式和必填字段'
            }, status=status.HTTP_400_BAD_REQUEST)

    def get_queryset(self):
        """获取文章列表，支持筛选"""
        queryset = Articles.objects.select_related('periodical', 'category').all()
        
        # 按状态筛选（支持前端的状态值）
        status_filter = self.request.query_params.get('status', None)
        if status_filter:
            # 前端可能传入 'published', 'reviewing_1' 等，需要映射到数据库状态
            status_mapping = {
                'published': 'READY_TO_PUBLISH',
                'reviewing_1': 'REVIEWING_1',
                'reviewing_2': 'REVIEWING_2',
                'pending_upload': 'PENDING_REVIEW_1',
                'review_group': None,  # 需要特殊处理
            }
            if status_filter in status_mapping:
                mapped_status = status_mapping[status_filter]
                if mapped_status:
                    queryset = queryset.filter(status=mapped_status)
                elif status_filter == 'review_group':
                    # 所有审核相关状态
                    queryset = queryset.filter(status__icontains='REVIEW')
            else:
                # 直接使用传入的状态值
                queryset = queryset.filter(status=status_filter)
        
        # 按期刊ID筛选（支持pid参数）
        periodical_id = self.request.query_params.get('periodical_id') or self.request.query_params.get('pid')
        if periodical_id:
            try:
                queryset = queryset.filter(periodical_id=int(periodical_id))
            except ValueError:
                pass
        
        # 按分类筛选
        category_id = self.request.query_params.get('category_id', None)
        if category_id:
            try:
                queryset = queryset.filter(category_id=int(category_id))
            except ValueError:
                pass
        
        # 按标题或作者搜索
        search = self.request.query_params.get('search', None)
        if search:
            queryset = queryset.filter(
                Q(title__icontains=search) | 
                Q(author_original__icontains=search)
            )
        
        return queryset.order_by('-id')

    @action(detail=False, methods=['get'])
    def stats(self, request):
        """获取文章统计信息"""
        total = Articles.objects.count()
        published = Articles.objects.filter(status__icontains='PUBLISH').count()
        reviewing = Articles.objects.filter(status__icontains='REVIEW').count()
        draft = Articles.objects.filter(status='DRAFT').count()
        
        return Response({
            'total': total,
            'published': published,
            'reviewing': reviewing,
            'draft': draft
        })

    @action(detail=False, methods=['get'])
    def test_connection(self, request):
        """测试数据库连接"""
        try:
            article_count = Articles.objects.count()
            return Response({
                'success': True,
                'message': '数据库连接成功！',
                'article_count': article_count,
                'database': connection.settings_dict['NAME']
            })
        except Exception as e:
            return Response({
                'success': False,
                'message': f'数据库连接失败: {str(e)}',
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['get'], url_path='test-doubao')
    def test_doubao(self, request):
        """
        测试豆包 API 是否可用。用示例标题和正文调用一次摘要生成，返回结果或错误信息。
        访问方式：GET /api/articles/test_doubao/
        """
        sample_title = '盲人阅读辅助技术发展概述'
        sample_content = '随着信息无障碍推进，盲人阅读辅助技术从点字、有声书发展到智能读屏与电子盲文。本文简要介绍当前主流辅助手段及其在期刊阅读中的应用。'
        try:
            summary = generate_ai_summary(sample_title, sample_content)
            if summary:
                return Response({
                    'success': True,
                    'message': '豆包 API 调用成功，摘要生成正常',
                    'sample_title': sample_title,
                    'sample_content': sample_content[:80] + '...',
                    'generated_summary': summary,
                })
            return Response({
                'success': False,
                'message': '豆包 API 返回了空摘要，请检查 DOUBAO_API_KEY、DOUBAO_MODEL 及网络',
                'sample_title': sample_title,
            }, status=status.HTTP_502_BAD_GATEWAY)
        except Exception as e:
            logger.exception('测试豆包 API 异常: %s', e)
            return Response({
                'success': False,
                'message': '豆包 API 调用异常',
                'error': str(e),
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['post'])
    def publish(self, request, pk=None):
        """
        管理员发布文章：仅当文章状态为「待发布」(READY_TO_PUBLISH) 时可调用。
        若 ai_summary 为空则自动调用豆包 API 生成 AI 摘要并写入，然后更新状态为已发布、记录发布时间。
        """
        article = self.get_object()
        if article.status != 'READY_TO_PUBLISH':
            return Response({
                'error': '当前文章状态不允许发布',
                'detail': '仅当文章状态为「待发布」时可点击发布。当前状态: %s' % (article.status or '未知')
            }, status=status.HTTP_400_BAD_REQUEST)

        previous_status = article.status
        now = timezone.now()

        # 若 AI 摘要为空，则调用豆包 API 生成并写入
        if not (article.ai_summary and article.ai_summary.strip()):
            summary = generate_ai_summary(article.title, article.content_text or '')
            if summary:
                article.ai_summary = summary[:1000]
            else:
                logger.warning('文章 %s AI 摘要生成失败，发布时摘要为空', article.id)

        article.status = 'PUBLISHED'
        article.publish_date = now
        article.save()

        # 记录审核日志（操作人必须为 api.models.Users 实例，使用管理员账号）
        try:
            operator = Users.objects.filter(role_type=3).first()
            if operator:
                AuditLogs.objects.create(
                    article=article,
                    operator=operator,
                    action_type='PUBLISH',
                    previous_status=previous_status,
                    new_status='PUBLISHED',
                    comment='管理员确认发布',
                    created_at=now
                )
        except Exception as e:
            logger.warning('记录发布审计日志失败: %s', e)

        serializer = self.get_serializer(article)
        return Response({
            'success': True,
            'message': '文章已发布',
            'article': serializer.data
        })


class PeriodicalViewSet(viewsets.ModelViewSet):
    authentication_classes = [ApiAllowAnyAuthentication]
    permission_classes = [AllowAny]
    """
    期刊视图集 - 支持完整的CRUD操作
    """
    queryset = Periodicals.objects.all()
    serializer_class = PeriodicalSerializer

    def list(self, request, *args, **kwargs):
        """列表接口加异常捕获，避免表不存在或 DB 错误时直接 500"""
        try:
            return super().list(request, *args, **kwargs)
        except Exception as e:
            logger.exception("期刊列表请求失败")
            return Response({
                'error': str(e),
                'message': '获取期刊列表失败',
                'detail': '请检查数据库表 periodicals 是否存在或联系管理员'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def update(self, request, *args, **kwargs):
        """更新期刊，提供更详细的错误信息"""
        try:
            return super().update(request, *args, **kwargs)
        except Exception as e:
            logger.error(f"更新期刊失败: {str(e)}", exc_info=True)
            return Response({
                'error': str(e),
                'detail': '更新期刊时发生错误，请检查数据格式和必填字段'
            }, status=status.HTTP_400_BAD_REQUEST)

    def get_queryset(self):
        """获取期刊列表，支持筛选"""
        queryset = Periodicals.objects.all()
        
        # 按状态筛选
        status_filter = self.request.query_params.get('status', None)
        if status_filter:
            if status_filter == 'published':
                queryset = queryset.filter(status=1)
            elif status_filter == 'archived':
                queryset = queryset.filter(status=2)
            else:
                queryset = queryset.filter(status=0)
        
        # 按年份筛选
        year = self.request.query_params.get('year', None)
        if year:
            try:
                queryset = queryset.filter(year=int(year))
            except ValueError:
                pass
        
        # 按标题或年份搜索（year 为整数字段，不能用 icontains）
        search = self.request.query_params.get('search', None)
        if search:
            q = Q(title__icontains=search)
            try:
                y = int(search)
                q = q | Q(year=y)
            except ValueError:
                pass
            queryset = queryset.filter(q)
        
        return queryset.order_by('-year', '-issue_no')

    def perform_create(self, serializer):
        """创建期刊时自动更新文章数"""
        instance = serializer.save()
        # 更新文章数缓存
        try:
            article_count = Articles.objects.filter(periodical=instance).count()
            instance.article_count = article_count
            instance.save()
        except Exception as e:
            logger.warning(f"更新期刊文章数失败: {str(e)}")

    @action(detail=False, methods=['get'])
    def stats(self, request):
        """获取期刊统计信息"""
        total = Periodicals.objects.count()
        published = Periodicals.objects.filter(status=1).count()
        archived = Periodicals.objects.filter(status=2).count()
        
        return Response({
            'total': total,
            'published': published,
            'archived': archived
        })


class UserViewSet(viewsets.ModelViewSet):
    authentication_classes = [ApiAllowAnyAuthentication]
    permission_classes = [AllowAny]
    queryset = Users.objects.all()
    serializer_class = UserSerializer
    
    def update(self, request, *args, **kwargs):
        """更新用户，提供更详细的错误信息"""
        try:
            return super().update(request, *args, **kwargs)
        except Exception as e:
            logger.error(f"更新用户失败: {str(e)}", exc_info=True)
            return Response({
                'error': str(e),
                'detail': '更新用户时发生错误，请检查数据格式和必填字段'
            }, status=status.HTTP_400_BAD_REQUEST)

    def get_queryset(self):
        """获取用户列表，支持筛选"""
        queryset = Users.objects.all()
        
        # 按角色筛选
        role = self.request.query_params.get('role', None)
        if role:
            if role == 'admin':
                queryset = queryset.filter(role_type=3)
            elif role == 'volunteer':
                queryset = queryset.filter(role_type=2)
            else:
                queryset = queryset.filter(role_type=1)
        
        # 按状态筛选
        status_filter = self.request.query_params.get('status', None)
        if status_filter:
            if status_filter == 'active':
                queryset = queryset.filter(status=1)
            elif status_filter == 'banned':
                queryset = queryset.filter(status=0)
        
        # 按关键词搜索
        search = self.request.query_params.get('search', None)
        if search:
            queryset = queryset.filter(
                Q(username__icontains=search) |
                Q(real_name__icontains=search) |
                Q(phone__icontains=search)
            )
        
        return queryset.order_by('-id')

    def perform_create(self, serializer):
        """创建用户时设置默认值"""
        user = serializer.save()
        # 如果是志愿者，创建志愿者档案
        if user.role_type == 2:
            try:
                VolunteerProfiles.objects.get_or_create(
                    user=user,
                    defaults={
                        'level': 1,
                        'audit_score': 100.00,
                        'total_tasks_completed': 0,
                        'current_tasks_count': 0
                    }
                )
            except Exception as e:
                logger.warning(f"创建志愿者档案失败: {str(e)}")

    @action(detail=True, methods=['post'])
    def toggle_status(self, request, pk=None):
        """切换用户状态（启用/禁用）"""
        user = self.get_object()
        user.status = 0 if user.status == 1 else 1
        user.save()
        return Response({
            'success': True,
            'status': 'active' if user.status == 1 else 'banned'
        })

    @action(detail=False, methods=['get'])
    def stats(self, request):
        """获取用户统计信息"""
        total = Users.objects.filter(status=1).count()
        admin = Users.objects.filter(role_type=3, status=1).count()
        volunteer = Users.objects.filter(role_type=2, status=1).count()
        
        return Response({
            'total': total,
            'admin': admin,
            'volunteer': volunteer
        })

    @action(detail=False, methods=['post'])
    def login(self, request):
        """
        登录：手机号 + 密码。
        请求体: { "phone": "13800138000", "password": "123456" }
        返回: 用户信息（用于前端展示），不含密码。
        """
        phone = (request.data.get('phone') or '').strip()
        password = request.data.get('password') or ''
        if not phone:
            return Response(
                {'error': '请输入手机号', 'detail': '手机号不能为空'},
                status=status.HTTP_400_BAD_REQUEST
            )
        if not password:
            return Response(
                {'error': '请输入密码', 'detail': '密码不能为空'},
                status=status.HTTP_400_BAD_REQUEST
            )
        try:
            user = Users.objects.get(phone=phone)
        except Users.DoesNotExist:
            return Response(
                {'error': '手机号或密码错误', 'detail': '未找到该手机号对应的用户'},
                status=status.HTTP_401_UNAUTHORIZED
            )
        if user.status != 1:
            return Response(
                {'error': '账号已被禁用', 'detail': '该账号已被禁用，请联系管理员'},
                status=status.HTTP_403_FORBIDDEN
            )
        stored = user.password_hash or ''
        # 支持 Django 加密格式；兼容旧数据明文密码
        if stored.startswith('pbkdf2_') or stored.startswith('bcrypt') or stored.startswith('argon2'):
            if not check_password(password, stored):
                return Response(
                    {'error': '手机号或密码错误', 'detail': '密码不正确'},
                    status=status.HTTP_401_UNAUTHORIZED
                )
        else:
            if stored != password:
                return Response(
                    {'error': '手机号或密码错误', 'detail': '密码不正确'},
                    status=status.HTTP_401_UNAUTHORIZED
                )
        # 更新最后登录时间
        user.last_login_at = timezone.now()
        user.save(update_fields=['last_login_at'])
        serializer = UserSerializer(user)
        data = serializer.data
        data['token'] = f'user_{user.id}'  # 简单占位，后续可改为 JWT
        return Response(data)

    @action(detail=False, methods=['post'], parser_classes=[MultiPartParser, FormParser])
    def batch_import(self, request):
        """批量导入用户"""
        try:
            if 'file' not in request.FILES:
                return Response({
                    'error': '未上传文件',
                    'message': '请选择要导入的Excel文件'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            file = request.FILES['file']
            
            # 检查文件类型
            if not file.name.endswith(('.xlsx', '.xls')):
                return Response({
                    'error': '文件格式错误',
                    'message': '仅支持 .xlsx 和 .xls 格式的Excel文件'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # 读取Excel文件
            try:
                df = pd.read_excel(io.BytesIO(file.read()))
            except Exception as e:
                return Response({
                    'error': '文件读取失败',
                    'message': f'无法读取Excel文件: {str(e)}'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # 检查必需的列
            required_columns = ['username', 'phone', 'real_name']
            missing_columns = [col for col in required_columns if col not in df.columns]
            if missing_columns:
                return Response({
                    'error': '缺少必需列',
                    'message': f'Excel文件必须包含以下列: {", ".join(missing_columns)}',
                    'missing_columns': missing_columns
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # 检查行数限制
            if len(df) > 500:
                return Response({
                    'error': '数据量过大',
                    'message': '单次最多导入500条记录，当前文件包含{}条'.format(len(df))
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # 批量创建用户
            success_count = 0
            error_count = 0
            errors = []
            
            for index, row in df.iterrows():
                try:
                    username = str(row.get('username', '')).strip()
                    phone = str(row.get('phone', '')).strip()
                    real_name = str(row.get('real_name', '')).strip()
                    role_type = row.get('role_type', 2)  # 默认为志愿者
                    status_val = row.get('status', 1)  # 默认为正常状态
                    
                    if not username or not phone:
                        error_count += 1
                        errors.append(f'第{index + 2}行: 用户名和手机号不能为空')
                        continue
                    
                    # 检查手机号是否已存在
                    if Users.objects.filter(phone=phone).exists():
                        error_count += 1
                        errors.append(f'第{index + 2}行: 手机号 {phone} 已存在')
                        continue
                    
                    from django.contrib.auth.hashers import make_password
                    user = Users.objects.create(
                        username=username,
                        phone=phone,
                        real_name=real_name if real_name else username,
                        role_type=int(role_type) if pd.notna(role_type) else 2,
                        status=int(status_val) if pd.notna(status_val) else 1,
                        password_hash=make_password('123456'),
                        created_at=datetime.now()
                    )
                    
                    # 如果是志愿者，创建志愿者档案
                    if user.role_type == 2:
                        VolunteerProfiles.objects.get_or_create(
                            user=user,
                            defaults={
                                'level': 1,
                                'audit_score': 100.00,
                                'total_tasks_completed': 0,
                                'current_tasks_count': 0
                            }
                        )
                    
                    success_count += 1
                except Exception as e:
                    error_count += 1
                    errors.append(f'第{index + 2}行: {str(e)}')
                    logger.error(f"导入第{index + 2}行用户失败: {str(e)}")
            
            return Response({
                'success': True,
                'total': len(df),
                'success_count': success_count,
                'error_count': error_count,
                'errors': errors[:10] if len(errors) > 10 else errors,  # 最多返回10个错误
                'message': f'成功导入 {success_count} 条，失败 {error_count} 条'
            })
            
        except Exception as e:
            logger.error(f"批量导入用户失败: {str(e)}", exc_info=True)
            return Response({
                'error': str(e),
                'message': '批量导入失败，请检查文件格式和数据'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class AccessApplicationViewSet(viewsets.ReadOnlyModelViewSet):
    authentication_classes = [ApiAllowAnyAuthentication]
    permission_classes = [AllowAny]
    """
    全文阅读申请视图集 - 管理员查看、同意/拒绝申请，并给用户发消息
    """
    queryset = AccessApplications.objects.select_related('user', 'article').all().order_by('-created_at')
    serializer_class = AccessApplicationSerializer

    def get_queryset(self):
        queryset = AccessApplications.objects.select_related('user', 'article').all().order_by('-created_at')
        status_param = self.request.query_params.get('status', None)
        if status_param is not None:
            try:
                status_int = int(status_param)
                queryset = queryset.filter(status=status_int)
            except ValueError:
                pass
        return queryset

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        """同意申请：更新状态为通过，并给申请人发消息"""
        application = self.get_object()
        if application.status is not None and application.status != 0:
            return Response({
                'error': '该申请已处理',
                'detail': '只能对待审状态的申请进行操作'
            }, status=status.HTTP_400_BAD_REQUEST)
        application.status = 1
        application.save()
        # 给申请人发消息
        article_title = application.article.title if application.article else '该文章'
        Messages.objects.create(
            user=application.user,
            title='全文阅读申请已通过',
            content=f'您对《{article_title}》的全文阅读申请已通过，您现在可以阅读该文章全文。',
            is_read=0,
            created_at=datetime.now()
        )
        return Response({
            'success': True,
            'message': '已同意申请并已通知用户',
            'status': 1
        })

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        """拒绝申请：更新状态为拒绝，并给申请人发消息"""
        application = self.get_object()
        if application.status is not None and application.status != 0:
            return Response({
                'error': '该申请已处理',
                'detail': '只能对待审状态的申请进行操作'
            }, status=status.HTTP_400_BAD_REQUEST)
        application.status = 2
        application.save()
        # 给申请人发消息
        article_title = application.article.title if application.article else '该文章'
        reject_reason = request.data.get('reason', '') or request.query_params.get('reason', '')
        content = f'您对《{article_title}》的全文阅读申请未通过。'
        if reject_reason:
            content += f' 原因：{reject_reason}'
        Messages.objects.create(
            user=application.user,
            title='全文阅读申请未通过',
            content=content,
            is_read=0,
            created_at=datetime.now()
        )
        return Response({
            'success': True,
            'message': '已拒绝申请并已通知用户',
            'status': 2
        })


class CategoryViewSet(viewsets.ModelViewSet):
    authentication_classes = [ApiAllowAnyAuthentication]
    permission_classes = [AllowAny]
    """
    分类视图集 - 支持完整的CRUD操作
    """
    queryset = Categories.objects.filter(is_active=1)
    serializer_class = CategorySerializer

    def get_queryset(self):
        """获取分类列表"""
        queryset = Categories.objects.all()
        # 只返回启用的分类
        active_only = self.request.query_params.get('active_only', 'true')
        if active_only.lower() == 'true':
            queryset = queryset.filter(is_active=1)
        return queryset.order_by('sort_order', 'id')


class DashboardViewSet(viewsets.ViewSet):
    authentication_classes = [ApiAllowAnyAuthentication]
    permission_classes = [AllowAny]
    """
    仪表板视图集 - 提供统计数据
    """
    @action(detail=False, methods=['get'])
    def overview(self, request):
        """获取仪表板概览数据"""
        try:
            # 用户统计
            total_users = Users.objects.filter(status=1).count()
            admin_count = Users.objects.filter(role_type=3, status=1).count()
            volunteer_count = Users.objects.filter(role_type=2, status=1).count()
            
            # 文章统计
            total_articles = Articles.objects.count()
            published_articles = Articles.objects.filter(
                status__icontains='PUBLISH'
            ).count()
            review_tasks = Articles.objects.filter(
                status__icontains='REVIEW'
            ).count()
            
            # 期刊统计
            total_periodicals = Periodicals.objects.count()
            
            # 最近发布的文章
            recent_articles = Articles.objects.filter(
                status__icontains='PUBLISH'
            ).order_by('-publish_date', '-created_at')[:5]
            
            article_serializer = ArticleSerializer(recent_articles, many=True)
            
            return Response({
                'users': {
                    'total': total_users,
                    'admin': admin_count,
                    'volunteer': volunteer_count
                },
                'articles': {
                    'total': total_articles,
                    'published': published_articles,
                    'reviewing': review_tasks
                },
                'periodicals': {
                    'total': total_periodicals
                },
                'recent_articles': article_serializer.data,
                'todo_items': [
                    {
                        'id': 1,
                        'type': 'review',
                        'title': '学术文章一审待处理',
                        'count': Articles.objects.filter(status='REVIEWING_1').count(),
                        'priority': 'high'
                    },
                    {
                        'id': 2,
                        'type': 'publish',
                        'title': '终审通过待排版发布',
                        'count': Articles.objects.filter(status='READY_TO_PUBLISH').count(),
                        'priority': 'medium'
                    },
                    {
                        'id': 3,
                        'type': 'claim',
                        'title': '新投稿件待认领转换',
                        'count': Articles.objects.filter(status='PENDING_REVIEW_1').count(),
                        'priority': 'low'
                    }
                ]
            })
        except Exception as e:
            logger.error(f"获取仪表板数据失败: {str(e)}", exc_info=True)
            return Response({
                'error': str(e),
                'message': '获取仪表板数据失败'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class SearchViewSet(viewsets.ViewSet):
    authentication_classes = [ApiAllowAnyAuthentication]
    permission_classes = [AllowAny]
    """
    全局搜索视图集
    """
    @action(detail=False, methods=['get'])
    def global_search(self, request):
        """全局搜索 - 搜索文章、期刊、用户"""
        query = request.query_params.get('q', '').strip()
        if not query:
            return Response({
                'articles': [],
                'periodicals': [],
                'users': []
            })
        
        try:
            # 搜索文章
            articles = Articles.objects.filter(
                Q(title__icontains=query) |
                Q(author_original__icontains=query) |
                Q(content_text__icontains=query)
            )[:10]
            article_serializer = ArticleSerializer(articles, many=True)
            
            # 搜索期刊
            periodicals = Periodicals.objects.filter(
                Q(title__icontains=query) |
                Q(year__icontains=query)
            )[:10]
            periodical_serializer = PeriodicalSerializer(periodicals, many=True)
            
            # 搜索用户
            users = Users.objects.filter(
                Q(username__icontains=query) |
                Q(real_name__icontains=query) |
                Q(phone__icontains=query)
            )[:10]
            user_serializer = UserSerializer(users, many=True)
            
            return Response({
                'articles': article_serializer.data,
                'periodicals': periodical_serializer.data,
                'users': user_serializer.data,
                'total': len(article_serializer.data) + len(periodical_serializer.data) + len(user_serializer.data)
            })
        except Exception as e:
            logger.error(f"全局搜索失败: {str(e)}", exc_info=True)
            return Response({
                'error': str(e),
                'message': '搜索失败'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class NotificationViewSet(viewsets.ViewSet):
    authentication_classes = [ApiAllowAnyAuthentication]
    permission_classes = [AllowAny]
    """
    通知视图集
    """
    def list(self, request):
        """GET /api/notifications/ 返回空列表，避免未定义 list 导致 405/500"""
        return Response({'notifications': [], 'unread_count': 0})

    @action(detail=False, methods=['get'])
    def get_notifications(self, request):
        """获取通知列表"""
        try:
            # 各统计单独 try 避免单表异常导致整接口 500
            def _count(model, **kwargs):
                try:
                    return model.objects.filter(**kwargs).count()
                except Exception as e:
                    logger.warning("get_notifications 统计失败 %s: %s", kwargs, e)
                    return 0
            pending_review_count = _count(Articles, status='REVIEWING_1')
            ready_to_publish_count = _count(Articles, status='READY_TO_PUBLISH')
            pending_claim_count = _count(Articles, status='PENDING_REVIEW_1')
            pending_access_count = _count(AccessApplications, status=0)
            
            notifications = []
            
            if pending_review_count > 0:
                notifications.append({
                    'id': 1,
                    'type': 'review',
                    'title': '待审核文章',
                    'message': f'有 {pending_review_count} 篇文章等待一审',
                    'count': pending_review_count,
                    'priority': 'high',
                    'created_at': datetime.now().isoformat(),
                    'link': '/articleList?status=reviewing_1'
                })
            
            if ready_to_publish_count > 0:
                notifications.append({
                    'id': 2,
                    'type': 'publish',
                    'title': '待发布文章',
                    'message': f'有 {ready_to_publish_count} 篇文章已通过审核，等待发布',
                    'count': ready_to_publish_count,
                    'priority': 'medium',
                    'created_at': datetime.now().isoformat(),
                    'link': '/articleList?status=published'
                })
            
            if pending_claim_count > 0:
                notifications.append({
                    'id': 3,
                    'type': 'claim',
                    'title': '待认领文章',
                    'message': f'有 {pending_claim_count} 篇新投稿件等待认领',
                    'count': pending_claim_count,
                    'priority': 'low',
                    'created_at': datetime.now().isoformat(),
                    'link': 'articleList?status=pending_upload'
                })
            
            # 待受理的全文阅读申请（已在上面用 _count 计算）
            if pending_access_count > 0:
                notifications.append({
                    'id': 4,
                    'type': 'access_application',
                    'title': '全文阅读申请待受理',
                    'message': f'有 {pending_access_count} 条全文阅读申请等待处理',
                    'count': pending_access_count,
                    'priority': 'high',
                    'created_at': datetime.now().isoformat(),
                    'link': 'accessApplications'
                })
            
            # 如果没有通知，返回一个空状态通知
            if not notifications:
                notifications.append({
                    'id': 0,
                    'type': 'empty',
                    'title': '暂无通知',
                    'message': '当前没有待处理的任务',
                    'count': 0,
                    'priority': 'info',
                    'created_at': datetime.now().isoformat()
                })
            
            return Response({
                'notifications': notifications,
                'unread_count': len([n for n in notifications if n.get('id', 0) > 0])
            })
        except Exception as e:
            logger.error(f"获取通知列表失败: {str(e)}", exc_info=True)
            return Response({
                'error': str(e),
                'message': '获取通知失败'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
