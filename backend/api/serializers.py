from rest_framework import serializers
from .models import (
    Articles, Periodicals, Users, Categories,
    ArticleStats, VolunteerProfiles, AccessApplications
)
import logging

logger = logging.getLogger(__name__)


class CategorySerializer(serializers.ModelSerializer):
    """栏目分类序列化器"""
    class Meta:
        model = Categories
        fields = ['id', 'name', 'sort_order', 'is_active']


class AccessApplicationSerializer(serializers.ModelSerializer):
    """全文阅读申请序列化器"""
    user_name = serializers.SerializerMethodField()
    user_phone = serializers.SerializerMethodField()
    article_title = serializers.SerializerMethodField()
    status_display = serializers.SerializerMethodField()
    created_at_display = serializers.SerializerMethodField()

    class Meta:
        model = AccessApplications
        fields = [
            'id', 'user', 'article', 'reason', 'status', 'created_at',
            'user_name', 'user_phone', 'article_title', 'status_display', 'created_at_display'
        ]
        read_only_fields = ['user', 'article', 'reason', 'created_at']

    def get_user_name(self, obj):
        if obj.user:
            return obj.user.real_name or obj.user.username or ''
        return ''

    def get_user_phone(self, obj):
        return obj.user.phone if obj.user else ''

    def get_article_title(self, obj):
        return obj.article.title if obj.article else ''

    def get_status_display(self, obj):
        if obj.status is None:
            return '待审'
        return {0: '待审', 1: '已通过', 2: '已拒绝'}.get(obj.status, '待审')

    def get_created_at_display(self, obj):
        if obj.created_at:
            return obj.created_at.strftime('%Y-%m-%d %H:%M') if hasattr(obj.created_at, 'strftime') else str(obj.created_at)
        return ''


class PeriodicalSerializer(serializers.ModelSerializer):
    """期刊序列化器"""
    # 前端需要的字段映射
    issue = serializers.IntegerField(source='issue_no', read_only=True)
    issueTotal = serializers.IntegerField(source='issue_no', read_only=True)  # 使用issue_no作为总期数
    date = serializers.SerializerMethodField()
    coverColor = serializers.SerializerMethodField()
    
    class Meta:
        model = Periodicals
        fields = [
            'id', 'title', 'year', 'issue_no', 'periodical_name',
            'cover_url', 'status', 'article_count', 'publish_date',
            # 前端映射字段
            'issue', 'issueTotal', 'date', 'coverColor'
        ]
        read_only_fields = ['article_count']
        extra_kwargs = {
            'status': {'required': False, 'allow_null': True}
        }

    def get_date(self, obj):
        """获取日期字符串"""
        if obj.publish_date:
            return obj.publish_date.strftime('%Y-%m-%d') if hasattr(obj.publish_date, 'strftime') else str(obj.publish_date)
        return ''

    def get_coverColor(self, obj):
        """获取封面颜色"""
        # 可以根据不同规则生成颜色，这里使用默认值
        colors = ['bg-blue-600', 'bg-green-600', 'bg-purple-600', 'bg-yellow-600', 'bg-red-600']
        return colors[obj.id % len(colors)] if obj.id else 'bg-blue-600'

    def validate_status(self, value):
        """验证并转换状态字段"""
        if value is None:
            return None
        # 如果是字符串，转换为整数
        if isinstance(value, str):
            if value == 'published':
                return 1
            elif value == 'archived':
                return 2
            elif value == 'draft':
                return 0
            else:
                # 尝试直接转换为整数
                try:
                    return int(value)
                except (ValueError, TypeError):
                    return 0
        # 如果已经是整数，直接返回
        return int(value) if value is not None else None

    def to_internal_value(self, data):
        """在验证之前处理数据"""
        # 如果 status 是字符串，先通过 validate_status 的逻辑处理它
        if 'status' in data and isinstance(data['status'], str):
            status_val = data['status']
            if status_val == 'published':
                data['status'] = 1
            elif status_val == 'archived':
                data['status'] = 2
            elif status_val == 'draft':
                data['status'] = 0
            else:
                try:
                    data['status'] = int(status_val)
                except (ValueError, TypeError):
                    data['status'] = 0
        return super().to_internal_value(data)

    def to_representation(self, instance):
        """转换为前端期望的格式"""
        data = super().to_representation(instance)
        # 状态映射：0=草稿, 1=已发布, 2=下架 -> published/archived
        status = data.get('status')
        # 确保 status 是整数类型进行比较
        if status is not None:
            try:
                status_int = int(status) if not isinstance(status, int) else status
                if status_int == 1:
                    data['status'] = 'published'
                elif status_int == 2:
                    data['status'] = 'archived'
                else:
                    data['status'] = 'draft'
            except (ValueError, TypeError):
                data['status'] = 'draft'
        else:
            data['status'] = 'draft'
        return data

    def create(self, validated_data):
        """创建期刊"""
        # 处理前端传入的字段
        initial_data = self.initial_data
        
        if 'issue' in initial_data:
            validated_data['issue_no'] = initial_data['issue']
        if 'issueTotal' in initial_data:
            # 如果前端传入了总期数，可以使用它
            validated_data['issue_no'] = initial_data['issueTotal']
        
        # 处理状态字段：从 validated_data 中移除字符串状态，然后根据 initial_data 设置整数状态
        if 'status' in validated_data:
            status_str = validated_data.pop('status')
            if isinstance(status_str, str):
                if status_str == 'published':
                    validated_data['status'] = 1
                elif status_str == 'archived':
                    validated_data['status'] = 2
                else:
                    validated_data['status'] = 0
            else:
                validated_data['status'] = status_str
        elif 'status' in initial_data:
            status = initial_data['status']
            if isinstance(status, str):
                if status == 'published':
                    validated_data['status'] = 1
                elif status == 'archived':
                    validated_data['status'] = 2
                else:
                    validated_data['status'] = 0
            else:
                validated_data['status'] = status
        else:
            validated_data['status'] = 0  # 默认草稿
        
        # 如果没有标题，自动生成
        if 'title' not in validated_data or not validated_data.get('title'):
            year = validated_data.get('year', 2025)
            issue = validated_data.get('issue_no', 1)
            issue_total = initial_data.get('issueTotal', issue)
            validated_data['title'] = f"{year}年第{issue}期 (总第{issue_total}期)"
        
        # 设置默认值
        if 'periodical_name' not in validated_data:
            validated_data['periodical_name'] = '盲人月刊'
        
        return super().create(validated_data)

    def update(self, instance, validated_data):
        """更新期刊"""
        # 处理前端传入的字段
        initial_data = self.initial_data
        
        if 'issue' in initial_data:
            validated_data['issue_no'] = initial_data['issue']
        if 'issueTotal' in initial_data:
            # issueTotal 和 issue 使用同一个字段
            validated_data['issue_no'] = initial_data['issueTotal']
        
        return super().update(instance, validated_data)


class UserSerializer(serializers.ModelSerializer):
    """用户序列化器"""
    # 前端需要的字段映射
    name = serializers.SerializerMethodField()
    role = serializers.SerializerMethodField()
    deleted = serializers.SerializerMethodField()
    
    class Meta:
        model = Users
        fields = [
            'id', 'username', 'phone', 'real_name', 'avatar_url',
            'role_type', 'status', 'last_login_at', 'created_at',
            # 前端映射字段
            'name', 'role', 'deleted'
        ]
        read_only_fields = ['created_at', 'last_login_at', 'password_hash']
        extra_kwargs = {
            'status': {'required': False, 'allow_null': True}
        }

    def get_name(self, obj):
        """获取显示名称"""
        return obj.real_name or obj.username or ''

    def get_role(self, obj):
        """获取角色字符串"""
        role_type = obj.role_type or 1
        if role_type == 3:
            return 'admin'
        elif role_type == 2:
            return 'volunteer'
        else:
            return 'user'

    def get_deleted(self, obj):
        """获取删除状态（软删除标记）"""
        return False  # 前端使用的软删除标记，实际使用status字段

    def validate_status(self, value):
        """验证并转换状态字段"""
        if value is None:
            return None
        # 如果是字符串，转换为整数
        if isinstance(value, str):
            if value == 'active':
                return 1
            elif value == 'banned':
                return 0
            else:
                # 尝试直接转换为整数
                try:
                    return int(value)
                except (ValueError, TypeError):
                    return 0
        # 如果已经是整数，直接返回
        return int(value) if value is not None else None

    def to_internal_value(self, data):
        """在验证之前处理数据"""
        # 如果 status 是字符串，先处理它
        if 'status' in data and isinstance(data['status'], str):
            status_val = data['status']
            if status_val == 'active':
                data['status'] = 1
            elif status_val == 'banned':
                data['status'] = 0
            else:
                try:
                    data['status'] = int(status_val)
                except (ValueError, TypeError):
                    data['status'] = 0
        return super().to_internal_value(data)

    def to_representation(self, instance):
        """转换为前端期望的格式"""
        data = super().to_representation(instance)
        # 状态映射：1=正常, 0=封禁 -> active/banned
        status = data.get('status')
        # 确保 status 是整数类型进行比较
        if status is not None:
            try:
                status_int = int(status) if not isinstance(status, int) else status
                data['status'] = 'active' if status_int == 1 else 'banned'
            except (ValueError, TypeError):
                # 如果转换失败，默认设为禁用
                data['status'] = 'banned'
        else:
            # None 值默认设为禁用
            data['status'] = 'banned'
        return data

    def create(self, validated_data):
        """创建用户"""
        # 处理前端传入的字段映射
        initial_data = self.initial_data
        
        if 'name' in initial_data:
            validated_data['real_name'] = initial_data['name']
        if 'role' in initial_data:
            role = initial_data['role']
            if role == 'admin':
                validated_data['role_type'] = 3
            elif role == 'volunteer':
                validated_data['role_type'] = 2
            else:
                validated_data['role_type'] = 1
        else:
            validated_data['role_type'] = 2  # 默认志愿者
        
        # 状态字段已经在 validate_status 中处理，这里只需要设置默认值
        if 'status' not in validated_data:
            validated_data['status'] = 1  # 默认正常状态
        
        from django.contrib.auth.hashers import make_password
        if 'password' in self.initial_data and self.initial_data.get('password'):
            validated_data['password_hash'] = make_password(self.initial_data['password'])
        elif 'password_hash' not in validated_data:
            validated_data['password_hash'] = make_password('123456')
        
        # 确保username和phone有值
        if 'username' not in validated_data:
            if 'phone' in validated_data:
                validated_data['username'] = validated_data.get('phone', '')
            elif 'name' in initial_data:
                validated_data['username'] = initial_data.get('name', 'user')
            else:
                validated_data['username'] = 'user'
        
        if 'phone' not in validated_data:
            if 'username' in validated_data:
                validated_data['phone'] = validated_data.get('username', '')
            else:
                validated_data['phone'] = ''
        
        return super().create(validated_data)

    def update(self, instance, validated_data):
        """更新用户"""
        # 处理前端传入的字段映射
        initial_data = self.initial_data
        
        if 'name' in initial_data:
            validated_data['real_name'] = initial_data['name']
        if 'role' in initial_data:
            role = initial_data['role']
            if role == 'admin':
                validated_data['role_type'] = 3
            elif role == 'volunteer':
                validated_data['role_type'] = 2
            else:
                validated_data['role_type'] = 1
        
        return super().update(instance, validated_data)


class ArticleSerializer(serializers.ModelSerializer):
    """文章序列化器"""
    # 关联字段（使用 SerializerMethodField 避免外键不存在时的错误）
    periodical_title = serializers.SerializerMethodField()
    category_name = serializers.SerializerMethodField()
    author_name = serializers.CharField(source='author_original', read_only=True)
    
    # 标题单独声明以便返回中文校验提示
    title = serializers.CharField(max_length=200, required=True, allow_blank=False, error_messages={'blank': '文献标题不能为空', 'required': '请填写文献标题'})
    
    # 统计信息（从 article_stats 表关联）
    views_count = serializers.SerializerMethodField()
    word_count = serializers.SerializerMethodField()
    favorites_count = serializers.SerializerMethodField()
    
    # 前端需要的字段
    pid = serializers.SerializerMethodField()
    author = serializers.CharField(source='author_original', read_only=True)
    content = serializers.CharField(source='content_text', read_only=True)
    abstract = serializers.CharField(source='ai_summary', read_only=True)
    uploadTime = serializers.SerializerMethodField()
    uploaderId = serializers.SerializerMethodField()
    keyword = serializers.SerializerMethodField()
    type = serializers.SerializerMethodField()

    class Meta:
        model = Articles
        fields = [
            'id', 'periodical_id', 'category_id', 'title', 'author_original',
            'content_text', 'content_braille', 'audio_url', 'ai_summary',
            'status', 'created_by', 'current_auditor', 'locked_at',
            'publish_date', 'created_at',
            # 额外字段
            'periodical_title', 'category_name', 'author_name',
            'views_count', 'word_count', 'favorites_count',
            # 前端字段
            'pid', 'author', 'content', 'abstract', 'uploadTime', 
            'uploaderId', 'keyword', 'type'
        ]
        read_only_fields = ['created_at', 'created_by', 'current_auditor', 'locked_at']

    def get_periodical_title(self, obj):
        """获取期刊标题"""
        try:
            return obj.periodical.title if obj.periodical else None
        except:
            return None

    def get_category_name(self, obj):
        """获取分类名称"""
        try:
            return obj.category.name if obj.category else None
        except:
            return None

    def get_pid(self, obj):
        """获取期刊ID（前端字段名）"""
        try:
            # 尝试多种方式获取periodical_id
            if hasattr(obj, 'periodical_id'):
                return obj.periodical_id
            elif hasattr(obj, 'periodical') and obj.periodical:
                return obj.periodical.id if hasattr(obj.periodical, 'id') else None
            return None
        except:
            return None

    def get_type(self, obj):
        """获取类型（使用分类名）"""
        try:
            return obj.category.name if obj.category else ''
        except:
            return ''

    def get_keyword(self, obj):
        """获取关键词列表（暂时返回空列表）"""
        return []

    def get_uploadTime(self, obj):
        """获取上传时间"""
        if obj.publish_date:
            return obj.publish_date.strftime('%Y-%m-%d') if hasattr(obj.publish_date, 'strftime') else str(obj.publish_date)
        elif obj.created_at:
            return obj.created_at.strftime('%Y-%m-%d') if hasattr(obj.created_at, 'strftime') else str(obj.created_at)
        return None

    def get_uploaderId(self, obj):
        """获取上传者ID"""
        if obj.created_by:
            return obj.created_by.id if hasattr(obj.created_by, 'id') else obj.created_by
        return None

    def get_views_count(self, obj):
        """从 article_stats 表获取阅读量"""
        try:
            stats = ArticleStats.objects.get(article=obj)
            return stats.views_count or 0
        except (ArticleStats.DoesNotExist, AttributeError):
            return 0

    def get_word_count(self, obj):
        """计算字数"""
        if obj.content_text:
            return len(obj.content_text)
        return 0

    def get_favorites_count(self, obj):
        """从 article_stats 表获取收藏量"""
        try:
            stats = ArticleStats.objects.get(article=obj)
            return stats.favorites_count or 0
        except (ArticleStats.DoesNotExist, AttributeError):
            return 0

    def create(self, validated_data):
        """创建文章"""
        # 处理前端传入的字段映射
        initial_data = self.initial_data
        
        # 处理期刊ID（必填，否则无法创建）
        if 'pid' in initial_data and initial_data['pid'] is not None and initial_data['pid'] != '':
            try:
                pid = int(initial_data['pid'])
                periodical = Periodicals.objects.get(id=pid)
                validated_data['periodical'] = periodical
            except (Periodicals.DoesNotExist, ValueError, TypeError):
                pass
        if 'periodical' not in validated_data and 'periodical_id' not in validated_data:
            first_periodical = Periodicals.objects.first()
            if first_periodical:
                validated_data['periodical'] = first_periodical
            else:
                raise serializers.ValidationError({'pid': '系统暂无期刊，请先创建期刊后再录入文献。'})
        
        # 处理作者
        if 'author' in initial_data:
            validated_data['author_original'] = initial_data['author']
        
        # 处理内容
        if 'content' in initial_data:
            validated_data['content_text'] = initial_data['content']
        
        # 处理摘要
        if 'abstract' in initial_data:
            validated_data['ai_summary'] = initial_data['abstract']
        
        # 处理分类（通过名称查找）；未设置时使用第一个栏目
        if 'type' in initial_data and initial_data['type']:
            try:
                category = Categories.objects.get(name=initial_data['type'])
                validated_data['category'] = category
            except Categories.DoesNotExist:
                default_category = Categories.objects.first()
                if default_category:
                    validated_data['category'] = default_category
        if 'category' not in validated_data:
            default_category = Categories.objects.first()
            if default_category:
                validated_data['category'] = default_category
            else:
                raise serializers.ValidationError({'category': '系统暂无栏目，请先在栏目管理中添加后再创建文献。'})
        
        # 状态映射
        if 'status' in initial_data:
            status = initial_data['status']
            old_status_mapping = {
                'published': 'PUBLISHED',
                'reviewing_1': 'REVIEWING_1',
                'reviewing_2': 'REVIEWING_2',
                'pending_upload': 'DRAFT',
                'review_passed': 'READY_TO_PUBLISH',
            }
            validated_data['status'] = old_status_mapping.get(status, status)
        else:
            validated_data['status'] = 'DRAFT'
        
        # 创建者：默认使用第一个用户
        if 'created_by' not in validated_data:
            default_user = Users.objects.first()
            if default_user:
                validated_data['created_by'] = default_user
            else:
                raise serializers.ValidationError({'created_by': '系统暂无用户，无法创建文献。请先创建用户。'})
        
        # 是否受限（数据库必填且无默认值）
        validated_data.setdefault('is_restricted', 0)
        
        instance = super().create(validated_data)
        
        # 创建统计记录
        try:
            ArticleStats.objects.get_or_create(
                article=instance,
                defaults={
                    'views_count': 0,
                    'downloads_count': 0,
                    'favorites_count': 0
                }
            )
        except Exception as e:
            logger.warning(f"创建文章统计记录失败: {str(e)}")
        
        return instance

    def update(self, instance, validated_data):
        """更新文章"""
        # 处理前端传入的字段映射
        initial_data = self.initial_data
        
        # 处理期刊ID
        if 'pid' in initial_data:
            pid = initial_data['pid']
            try:
                periodical = Periodicals.objects.get(id=pid)
                validated_data['periodical'] = periodical
            except Periodicals.DoesNotExist:
                validated_data['periodical_id'] = pid
        
        # 处理其他字段
        if 'author' in initial_data:
            validated_data['author_original'] = initial_data['author']
        if 'content' in initial_data:
            validated_data['content_text'] = initial_data['content']
        if 'abstract' in initial_data:
            validated_data['ai_summary'] = initial_data['abstract']
        if 'type' in initial_data and initial_data['type']:
            try:
                category = Categories.objects.get(name=initial_data['type'])
                validated_data['category'] = category
            except Categories.DoesNotExist:
                # 如果分类不存在，保持原有分类
                pass
        
        # 状态映射：支持新旧状态
        if 'status' in initial_data:
            status = initial_data['status']
            # 旧状态映射
            old_status_mapping = {
                'published': 'PUBLISHED',
                'reviewing_1': 'REVIEWING_1',
                'reviewing_2': 'REVIEWING_2',
                'pending_upload': 'DRAFT',
                'review_passed': 'READY_TO_PUBLISH',
            }
            validated_data['status'] = old_status_mapping.get(status, status)
        
        return super().update(instance, validated_data)


class ArticleStatsSerializer(serializers.ModelSerializer):
    """文章统计序列化器"""
    class Meta:
        model = ArticleStats
        fields = ['article', 'views_count', 'downloads_count', 'favorites_count']


class VolunteerProfileSerializer(serializers.ModelSerializer):
    """志愿者档案序列化器"""
    user = UserSerializer(read_only=True)
    
    class Meta:
        model = VolunteerProfiles
        fields = [
            'user', 'level', 'audit_score', 'total_tasks_completed',
            'current_tasks_count', 'skills'
        ]
