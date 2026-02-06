from django.db import models
import json

class AccessApplications(models.Model):
    id = models.BigAutoField(primary_key=True, db_comment='申请ID')
    user = models.ForeignKey('Users', models.DO_NOTHING, db_comment='申请用户')
    article = models.ForeignKey('Articles', models.DO_NOTHING, db_comment='申请阅读的文章')
    reason = models.CharField(max_length=500, db_comment='申请理由')
    status = models.IntegerField(blank=True, null=True, db_comment='0:待审, 1:通过, 2:拒绝')
    created_at = models.DateTimeField(blank=True, null=True, db_comment='申请时间')

    class Meta:
        managed = False
        db_table = 'access_applications'
        db_table_comment = '全文阅读申请表'


class ArticleStats(models.Model):
    article = models.OneToOneField('Articles', models.DO_NOTHING, primary_key=True, db_comment='关联文章ID')
    views_count = models.IntegerField(blank=True, null=True, db_comment='阅读量')
    downloads_count = models.IntegerField(blank=True, null=True, db_comment='下载量')
    favorites_count = models.IntegerField(blank=True, null=True, db_comment='收藏量')

    class Meta:
        managed = False
        db_table = 'article_stats'
        db_table_comment = '文章数据统计表'


class Articles(models.Model):
    id = models.BigAutoField(primary_key=True, db_comment='文章ID')
    periodical = models.ForeignKey('Periodicals', models.DO_NOTHING, db_comment='所属期刊')
    category = models.ForeignKey('Categories', models.DO_NOTHING, db_comment='所属栏目')
    title = models.CharField(max_length=200, db_comment='文章标题')
    author_original = models.CharField(max_length=100, blank=True, null=True, db_comment='原文作者')
    content_text = models.TextField(blank=True, null=True, db_comment='[最新]纯文本内容')
    content_braille = models.TextField(blank=True, null=True, db_comment='[最新]盲文编码内容')
    audio_url = models.CharField(max_length=255, blank=True, null=True, db_comment='音频链接')
    ai_summary = models.CharField(max_length=1000, blank=True, null=True, db_comment='AI摘要')
    status = models.CharField(max_length=30, blank=True, null=True, db_comment='状态机: PENDING_REVIEW_1, REVIEWING_1 等')
    created_by = models.ForeignKey('Users', models.DO_NOTHING, db_column='created_by', db_comment='录入者/创建者')
    current_auditor = models.ForeignKey('Users', models.DO_NOTHING, related_name='articles_current_auditor_set', blank=True, null=True, db_comment='[互斥锁]当前谁在审核')
    first_auditor = models.ForeignKey('Users', models.DO_NOTHING, related_name='articles_first_auditor_set', blank=True, null=True, db_comment='一审通过者ID (用于回避原则)')
    second_auditor = models.ForeignKey('Users', models.DO_NOTHING, related_name='articles_second_auditor_set', blank=True, null=True, db_comment='二审通过者ID (用于历史记录)')
    locked_at = models.DateTimeField(blank=True, null=True, db_comment='[超时锁]任务锁定时间')
    publish_date = models.DateTimeField(blank=True, null=True, db_comment='最终发布时间')
    created_at = models.DateTimeField(blank=True, null=True)
    is_restricted = models.IntegerField(db_comment='是否受限')

    class Meta:
        managed = False
        db_table = 'articles'
        db_table_comment = '文章主表-核心'


class AuditLogs(models.Model):
    id = models.BigAutoField(primary_key=True, db_comment='日志ID')
    article = models.ForeignKey(Articles, models.DO_NOTHING, db_comment='关联文章')
    operator = models.ForeignKey('Users', models.DO_NOTHING, db_comment='操作人')
    action_type = models.CharField(max_length=30, db_comment='类型: CLAIM, MODIFY, PASS, PUBLISH')
    previous_status = models.CharField(max_length=30, db_comment='原状态')
    new_status = models.CharField(max_length=30, db_comment='新状态')
    comment = models.CharField(max_length=255, blank=True, null=True, db_comment='操作备注')
    created_at = models.DateTimeField(blank=True, null=True, db_comment='操作时间')

    class Meta:
        managed = False
        db_table = 'audit_logs'
        db_table_comment = '审核操作日志表'


class AuditTasks(models.Model):
    id = models.BigAutoField(primary_key=True, db_comment='任务ID')
    article = models.ForeignKey(Articles, models.DO_NOTHING, db_comment='关联文章')
    review_round = models.IntegerField(db_comment='审核轮次: 1=一审, 2=二审')
    task_status = models.CharField(max_length=20, db_comment='任务状态')
    assigned_to = models.ForeignKey('Users', models.DO_NOTHING, blank=True, null=True, db_comment='被分配的审核员ID（管理员指定）')
    assigned_by = models.ForeignKey('Users', models.DO_NOTHING, related_name='audittasks_assigned_by_set', blank=True, null=True, db_comment='分配人ID（管理员）')
    assigned_at = models.DateTimeField(blank=True, null=True, db_comment='分配时间')
    claimed_by = models.ForeignKey('Users', models.DO_NOTHING, related_name='audittasks_claimed_by_set', blank=True, null=True, db_comment='实际领取人ID')
    claimed_at = models.DateTimeField(blank=True, null=True, db_comment='领取时间')
    completed_at = models.DateTimeField(blank=True, null=True, db_comment='完成时间（通过/驳回/超时）')
    result = models.CharField(max_length=20, blank=True, null=True, db_comment='审核结果: PASS=通过, REJECT=驳回')
    reject_reason = models.CharField(max_length=500, blank=True, null=True, db_comment='驳回原因')
    created_at = models.DateTimeField(blank=True, null=True, db_comment='任务创建时间')
    updated_at = models.DateTimeField(blank=True, null=True, db_comment='更新时间')

    class Meta:
        managed = False
        db_table = 'audit_tasks'
        db_table_comment = '审核任务表'


class AuthGroup(models.Model):
    name = models.CharField(unique=True, max_length=150)

    class Meta:
        managed = False
        db_table = 'auth_group'


class AuthGroupPermissions(models.Model):
    id = models.BigAutoField(primary_key=True)
    group = models.ForeignKey(AuthGroup, models.DO_NOTHING)
    permission = models.ForeignKey('AuthPermission', models.DO_NOTHING)

    class Meta:
        managed = False
        db_table = 'auth_group_permissions'
        unique_together = (('group', 'permission'),)


class AuthPermission(models.Model):
    name = models.CharField(max_length=255)
    content_type = models.ForeignKey('DjangoContentType', models.DO_NOTHING)
    codename = models.CharField(max_length=100)

    class Meta:
        managed = False
        db_table = 'auth_permission'
        unique_together = (('content_type', 'codename'),)


class AuthUser(models.Model):
    password = models.CharField(max_length=128)
    last_login = models.DateTimeField(blank=True, null=True)
    is_superuser = models.IntegerField()
    username = models.CharField(unique=True, max_length=150)
    first_name = models.CharField(max_length=150)
    last_name = models.CharField(max_length=150)
    email = models.CharField(max_length=254)
    is_staff = models.IntegerField()
    is_active = models.IntegerField()
    date_joined = models.DateTimeField()

    class Meta:
        managed = False
        db_table = 'auth_user'


class AuthUserGroups(models.Model):
    id = models.BigAutoField(primary_key=True)
    user = models.ForeignKey(AuthUser, models.DO_NOTHING)
    group = models.ForeignKey(AuthGroup, models.DO_NOTHING)

    class Meta:
        managed = False
        db_table = 'auth_user_groups'
        unique_together = (('user', 'group'),)


class AuthUserUserPermissions(models.Model):
    id = models.BigAutoField(primary_key=True)
    user = models.ForeignKey(AuthUser, models.DO_NOTHING)
    permission = models.ForeignKey(AuthPermission, models.DO_NOTHING)

    class Meta:
        managed = False
        db_table = 'auth_user_user_permissions'
        unique_together = (('user', 'permission'),)


class Categories(models.Model):
    name = models.CharField(max_length=50, db_comment='栏目名')
    sort_order = models.IntegerField(blank=True, null=True, db_comment='排序权重')
    is_active = models.IntegerField(blank=True, null=True, db_comment='是否启用')

    class Meta:
        managed = False
        db_table = 'categories'
        db_table_comment = '栏目分类表'


class ContentVersions(models.Model):
    id = models.BigAutoField(primary_key=True, db_comment='版本ID')
    article = models.ForeignKey(Articles, models.DO_NOTHING, db_comment='关联文章')
    editor = models.ForeignKey('Users', models.DO_NOTHING, db_comment='修改人')
    version_no = models.IntegerField(db_comment='版本号')
    content_text = models.TextField(blank=True, null=True, db_comment='文本快照')
    content_braille = models.TextField(blank=True, null=True, db_comment='盲文快照')
    change_log = models.CharField(max_length=500, blank=True, null=True, db_comment='修改备注')
    created_at = models.DateTimeField(blank=True, null=True, db_comment='归档时间')

    class Meta:
        managed = False
        db_table = 'content_versions'
        db_table_comment = '内容版本历史表'


class DjangoAdminLog(models.Model):
    action_time = models.DateTimeField()
    object_id = models.TextField(blank=True, null=True)
    object_repr = models.CharField(max_length=200)
    action_flag = models.PositiveSmallIntegerField()
    change_message = models.TextField()
    content_type = models.ForeignKey('DjangoContentType', models.DO_NOTHING, blank=True, null=True)
    user = models.ForeignKey(AuthUser, models.DO_NOTHING)

    class Meta:
        managed = False
        db_table = 'django_admin_log'


class DjangoContentType(models.Model):
    app_label = models.CharField(max_length=100)
    model = models.CharField(max_length=100)

    class Meta:
        managed = False
        db_table = 'django_content_type'
        unique_together = (('app_label', 'model'),)


class DjangoMigrations(models.Model):
    id = models.BigAutoField(primary_key=True)
    app = models.CharField(max_length=255)
    name = models.CharField(max_length=255)
    applied = models.DateTimeField()

    class Meta:
        managed = False
        db_table = 'django_migrations'


class DjangoSession(models.Model):
    session_key = models.CharField(primary_key=True, max_length=40)
    session_data = models.TextField()
    expire_date = models.DateTimeField()

    class Meta:
        managed = False
        db_table = 'django_session'


class Downloads(models.Model):
    id = models.BigAutoField(primary_key=True, db_comment='记录ID')
    user = models.ForeignKey('Users', models.DO_NOTHING, db_comment='用户')
    article = models.ForeignKey(Articles, models.DO_NOTHING, db_comment='文章')
    ip_address = models.CharField(max_length=45, blank=True, null=True, db_comment='客户端IP')
    download_date = models.DateTimeField(blank=True, null=True, db_comment='下载时间')

    class Meta:
        managed = False
        db_table = 'downloads'
        db_table_comment = '下载记录表'


class Favorites(models.Model):
    id = models.BigAutoField(primary_key=True, db_comment='记录ID')
    user = models.ForeignKey('Users', models.DO_NOTHING, db_comment='用户')
    article = models.ForeignKey(Articles, models.DO_NOTHING, db_comment='文章')
    folder_name = models.CharField(max_length=50, blank=True, null=True, db_comment='收藏夹分类名')
    created_at = models.DateTimeField(blank=True, null=True, db_comment='收藏时间')

    class Meta:
        managed = False
        db_table = 'favorites'
        db_table_comment = '收藏夹表'


class Messages(models.Model):
    id = models.BigAutoField(primary_key=True, db_comment='消息ID')
    user = models.ForeignKey('Users', models.DO_NOTHING, db_comment='关联用户')
    title = models.CharField(max_length=100, db_comment='消息标题')
    content = models.TextField(db_comment='消息内容')
    is_read = models.IntegerField(db_comment='是否已读')
    created_at = models.DateTimeField(blank=True, null=True, db_comment='创建时间')

    class Meta:
        managed = False
        db_table = 'messages'
        db_table_comment = '系统消息表'


class Periodicals(models.Model):
    id = models.BigAutoField(primary_key=True, db_comment='期刊ID')
    title = models.CharField(max_length=100, db_comment='标题')
    year = models.IntegerField(db_comment='年份')
    issue_no = models.IntegerField(db_comment='期号')
    periodical_name = models.CharField(max_length=50, blank=True, null=True, db_comment='刊物名称')
    cover_url = models.CharField(max_length=255, blank=True, null=True, db_comment='封面图片')
    status = models.IntegerField(blank=True, null=True, db_comment='0:草稿, 1:已发布, 2:下架')
    article_count = models.IntegerField(blank=True, null=True, db_comment='缓存文章总数')
    publish_date = models.DateTimeField(blank=True, null=True, db_comment='发布日期')

    class Meta:
        managed = False
        db_table = 'periodicals'
        db_table_comment = '期刊表'


class ReadHistory(models.Model):
    id = models.BigAutoField(primary_key=True)
    updated_at = models.DateTimeField()
    article_id = models.BigIntegerField()
    user_id = models.BigIntegerField()

    class Meta:
        managed = False
        db_table = 'read_history'


class Users(models.Model):
    id = models.BigAutoField(primary_key=True, db_comment='用户唯一标识')
    username = models.CharField(max_length=50, db_comment='昵称/显示名')
    phone = models.CharField(unique=True, max_length=20, db_comment='登录手机号')
    password_hash = models.CharField(max_length=255, db_comment='加密后的密码')
    real_name = models.CharField(max_length=50, blank=True, null=True, db_comment='真实姓名(志愿者/管理员需实名)')
    avatar_url = models.CharField(max_length=255, blank=True, null=True, db_comment='头像链接')
    role_type = models.IntegerField(blank=True, null=True, db_comment='1:普通用户, 2:志愿者, 3:管理员')
    status = models.IntegerField(blank=True, null=True, db_comment='1:正常, 0:封禁')
    last_login_at = models.DateTimeField(blank=True, null=True, db_comment='最后登录时间')
    must_change_password = models.IntegerField(blank=True, null=True, db_comment='是否需要强制修改密码')
    created_at = models.DateTimeField(blank=True, null=True, db_comment='注册时间')

    class Meta:
        managed = False
        db_table = 'users'
        db_table_comment = '用户基础表'


class VolunteerProfiles(models.Model):
    user = models.OneToOneField(Users, models.DO_NOTHING, primary_key=True, db_comment='关联用户表ID')
    level = models.IntegerField(blank=True, null=True, db_comment='志愿者等级')
    audit_score = models.DecimalField(max_digits=5, decimal_places=2, blank=True, null=True, db_comment='信用分/质量分')
    total_tasks_completed = models.IntegerField(blank=True, null=True, db_comment='累计完成任务数')
    current_tasks_count = models.IntegerField(blank=True, null=True, db_comment='[并发锁]当前手中未完成的任务数')
    skills = models.JSONField(blank=True, null=True, db_comment='技能标签')

    class Meta:
        managed = False
        db_table = 'volunteer_profiles'
        db_table_comment = '志愿者档案表'