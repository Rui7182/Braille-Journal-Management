import React from 'react';
import {
  Users,
  FileText,
  BookOpen,
  FileCheck,
  CheckCircle,
  Clock,
  AlertCircle,
  Zap,
  TrendingUp,
  ChevronRight,
  PlusCircle,
  ArrowUpRight,
} from 'lucide-react';

export const DashboardOverview = ({ users, articles, periodicals, onNavigate }) => {
  // 统计数据计算
  const totalUsers = users.filter(u => !u.deleted).length;
  const totalArticles = articles.length;
  const totalPeriodicals = periodicals.length;
  const publishedArticles = articles.filter(a => a.status === 'PUBLISHED').length;
  const reviewTasks = articles.filter(a => ['REVIEWING_1', 'REVIEWING_2', 'PENDING_REVIEW_1', 'PENDING_REVIEW_2', 'PENDING_ASSIGN_1', 'PENDING_ASSIGN_2'].includes(a.status)).length;

  // 计算较上月同期增长（基于创建时间）
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
  const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;

  // 计算本月新增用户
  const currentMonthUsers = users.filter(u => {
    if (!u.created_at) return false;
    const createdDate = new Date(u.created_at);
    return createdDate.getMonth() === currentMonth && createdDate.getFullYear() === currentYear;
  }).length;

  // 计算上月新增用户
  const lastMonthUsers = users.filter(u => {
    if (!u.created_at) return false;
    const createdDate = new Date(u.created_at);
    return createdDate.getMonth() === lastMonth && createdDate.getFullYear() === lastMonthYear;
  }).length;

  // 计算本月新增文章
  const currentMonthArticles = articles.filter(a => {
    if (!a.created_at && !a.uploadTime) return false;
    const createdDate = new Date(a.created_at || a.uploadTime);
    return createdDate.getMonth() === currentMonth && createdDate.getFullYear() === currentYear;
  }).length;

  // 计算上月新增文章
  const lastMonthArticles = articles.filter(a => {
    if (!a.created_at && !a.uploadTime) return false;
    const createdDate = new Date(a.created_at || a.uploadTime);
    return createdDate.getMonth() === lastMonth && createdDate.getFullYear() === lastMonthYear;
  }).length;

  // 计算本月新增期刊
  const currentMonthPeriodicals = periodicals.filter(p => {
    if (!p.publish_date && !p.created_at) return false;
    const createdDate = new Date(p.publish_date || p.created_at);
    return createdDate.getMonth() === currentMonth && createdDate.getFullYear() === currentYear;
  }).length;

  // 计算上月新增期刊
  const lastMonthPeriodicals = periodicals.filter(p => {
    if (!p.publish_date && !p.created_at) return false;
    const createdDate = new Date(p.publish_date || p.created_at);
    return createdDate.getMonth() === lastMonth && createdDate.getFullYear() === lastMonthYear;
  }).length;

  // 计算增长率
  const calculateGrowth = (current, last) => {
    if (last === 0) return current > 0 ? `+${current}` : '0';
    const growth = current - last;
    const percent = Math.round((growth / last) * 100);
    return growth >= 0 ? `+${percent}%` : `${percent}%`;
  };

  const userGrowth = calculateGrowth(currentMonthUsers, lastMonthUsers);
  const articleGrowth = calculateGrowth(currentMonthArticles, lastMonthArticles);
  const periodicalGrowth = calculateGrowth(currentMonthPeriodicals, lastMonthPeriodicals);

  // 最近发布的文章（最多5篇）
  const recentPublished = articles
    .filter(a => a.status === 'PUBLISHED')
    .sort((a, b) => new Date(b.uploadTime) - new Date(a.uploadTime))
    .slice(0, 5);

  // 待办事项
  const todoItems = [
    {
      id: 1,
      type: 'review',
      title: '学术文章一审待处理',
      count: articles.filter(a => a.status === 'REVIEWING_1' || a.status === 'PENDING_REVIEW_1' || a.status === 'PENDING_ASSIGN_1').length,
      priority: 'high',
      time: '2小时前',
    },
    {
      id: 2,
      type: 'publish',
      title: '终审通过待排版发布',
      count: articles.filter(a => a.status === 'READY_TO_PUBLISH').length,
      priority: 'medium',
      time: '5小时前',
    },
    {
      id: 3,
      type: 'claim',
      title: '新投稿件待认领转换',
      count: articles.filter(a => a.status === 'DRAFT').length,
      priority: 'low',
      time: '1天前',
    },
  ];

  // 文章状态分布
  const statusDistribution = [
    { status: '已发布', count: publishedArticles, color: '#10b981' },
    { status: '审核中', count: reviewTasks, color: '#3b82f6' },
    { status: '草稿/待处理', count: totalArticles - publishedArticles - reviewTasks, color: '#f59e0b' },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      {/* 顶部统计卡片 - 更加精致的学术/专业风格 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: '用户总数', value: totalUsers, icon: Users, color: 'blue', trend: userGrowth },
          { label: '收录文献', value: totalArticles, icon: FileText, color: 'indigo', trend: articleGrowth },
          { label: '期刊期数', value: totalPeriodicals, icon: BookOpen, color: 'emerald', trend: periodicalGrowth },
          { label: '待办审稿', value: reviewTasks, icon: FileCheck, color: 'amber', trend: reviewTasks > 0 ? '需关注' : '正常' },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
            <div className={`absolute top-0 left-0 w-1 h-full bg-${stat.color}-500 opacity-0 group-hover:opacity-100 transition-opacity`}></div>
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">{stat.label}</p>
                <h3 className="text-2xl font-black text-gray-800 tracking-tight">{stat.value}</h3>
              </div>
              <div className={`p-2 bg-${stat.color}-50 rounded-lg text-${stat.color}-600 group-hover:scale-110 transition-transform`}>
                <stat.icon className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between text-[10px]">
              <div className={`flex items-center gap-1 font-bold ${
                stat.trend.startsWith('+') || stat.trend === '正常' 
                  ? 'text-green-600' 
                  : stat.trend.startsWith('-') 
                    ? 'text-red-600' 
                    : 'text-amber-600'
              }`}>
                {stat.trend !== '需关注' && stat.trend !== '正常' && <TrendingUp className="h-3 w-3" />}
                <span>{stat.trend}</span>
              </div>
              <span className="text-gray-400">较上月同期</span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左侧主要区域：待办事项与最新动态 */}
        <div className="lg:col-span-2 space-y-6">
          {/* 待办审稿任务 */}
          <section className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between bg-gray-50/30">
              <h3 className="font-bold text-gray-800 text-sm flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-[#005bac]" />
                待处理审稿任务
              </h3>
              <button 
                onClick={() => {
                  if (onNavigate) {
                    onNavigate('articleList');
                  }
                }}
                className="text-[11px] text-[#005bac] font-bold hover:underline"
              >
                查看所有
              </button>
            </div>
            <div className="divide-y divide-gray-50">
              {todoItems.map(item => (
                <div key={item.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors group">
                  <div className="flex items-center gap-4">
                    <div className={`w-1.5 h-10 rounded-full ${
                      item.priority === 'high' ? 'bg-red-500' : 
                      item.priority === 'medium' ? 'bg-amber-500' : 'bg-blue-500'
                    }`}></div>
                    <div>
                      <h4 className="text-sm font-bold text-gray-800 group-hover:text-[#005bac] transition-colors">{item.title}</h4>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-[10px] text-gray-400 flex items-center gap-1">
                          <Clock className="h-3 w-3" /> {item.time}
                        </span>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-black uppercase ${
                          item.priority === 'high' ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-gray-500'
                        }`}>
                          {item.priority}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <div className="text-lg font-black text-gray-800 leading-none">{item.count}</div>
                      <div className="text-[9px] text-gray-400 font-bold uppercase mt-1">Pending</div>
                    </div>
                    <button 
                      onClick={() => {
                        if (onNavigate) {
                          onNavigate('articleList');
                        }
                      }}
                      className="p-2 bg-gray-50 text-gray-400 rounded-lg hover:bg-[#005bac] hover:text-white transition-all shadow-sm"
                      title="处理任务"
                    >
                      <PlusCircle className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* 最近收录文献 */}
          <section className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
              <h3 className="font-bold text-gray-800 text-sm flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-emerald-500" />
                最新收录文献
              </h3>
              <span className="text-[10px] text-gray-400 font-bold">
                本月已收录 {currentMonthArticles} 篇
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50/50 text-[10px] text-gray-400 uppercase font-bold tracking-widest border-b border-gray-50">
                  <tr>
                    <th className="px-6 py-3">文献标题</th>
                    <th className="px-6 py-3">主要责任人</th>
                    <th className="px-6 py-3">收录日期</th>
                    <th className="px-6 py-3 text-right">状态</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {recentPublished.map((article) => (
                    <tr key={article.id} className="hover:bg-gray-50/80 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400"></div>
                          <p className="text-sm font-semibold text-gray-700 line-clamp-1 group-hover:text-[#005bac] transition-colors">{article.title}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-[11px] text-gray-500 font-medium">{article.author}</td>
                      <td className="px-6 py-4 text-[11px] text-gray-400">{article.uploadTime}</td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-[10px] px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded font-bold">已发布</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="p-3 bg-gray-50/50 border-t border-gray-50 text-center">
              <button 
                onClick={() => {
                  if (onNavigate) {
                    onNavigate('articleList');
                  }
                }}
                className="text-[11px] text-gray-400 font-bold hover:text-[#005bac] flex items-center gap-1 mx-auto transition-colors"
              >
                进入文献中心查看全部 <ChevronRight className="h-3 w-3" />
              </button>
            </div>
          </section>
        </div>

        {/* 右侧：统计图表与人员贡献 */}
        <div className="space-y-6">
          {/* 文献分布统计 */}
          <section className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
            <h3 className="font-bold text-gray-800 text-sm mb-6 flex items-center gap-2">
              <Zap className="h-4 w-4 text-indigo-500" />
              文献资源结构
            </h3>
            <div className="space-y-5">
              {statusDistribution.map((item, i) => (
                <div key={i} className="space-y-2">
                  <div className="flex justify-between items-end">
                    <span className="text-[11px] font-bold text-gray-500">{item.status}</span>
                    <span className="text-sm font-black text-gray-800">{item.count}</span>
                  </div>
                  <div className="h-2 w-full bg-gray-50 rounded-full overflow-hidden border border-gray-100/50">
                    <div 
                      className="h-full rounded-full transition-all duration-1000 ease-out" 
                      style={{ 
                        width: `${(item.count / totalArticles) * 100}%`,
                        backgroundColor: item.color 
                      }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-8 pt-6 border-t border-gray-50 flex items-center justify-between">
              <div className="text-center">
                <div className="text-xl font-black text-gray-800 tracking-tight">{Math.round((publishedArticles/totalArticles)*100)}%</div>
                <div className="text-[9px] text-gray-400 font-bold uppercase tracking-tighter mt-1">完成率</div>
              </div>
              <div className="h-8 w-px bg-gray-100"></div>
              <div className="text-center">
                <div className="text-xl font-black text-[#005bac] tracking-tight">{reviewTasks}</div>
                <div className="text-[9px] text-gray-400 font-bold uppercase tracking-tighter mt-1">待终审</div>
              </div>
              <div className="h-8 w-px bg-gray-100"></div>
              <div className="text-center">
                <div className="text-xl font-black text-gray-800 tracking-tight">{totalArticles}</div>
                <div className="text-[9px] text-gray-400 font-bold uppercase tracking-tighter mt-1">总库容</div>
              </div>
            </div>
          </section>

          {/* 快捷操作/通知 */}
          <section className="bg-gradient-to-br from-[#005bac] to-[#004a8d] p-5 rounded-xl shadow-lg shadow-blue-900/20 text-white relative overflow-hidden">
            <ArrowUpRight className="absolute -top-4 -right-4 w-24 h-24 opacity-10" />
            <h3 className="font-bold text-sm mb-3 relative z-10">系统管理指南</h3>
            <p className="text-xs text-blue-100/80 leading-relaxed mb-5 relative z-10">
              快速管理期刊、文章和用户。使用顶部搜索栏查找内容，通知中心显示待办任务。
            </p>
            <div className="grid grid-cols-2 gap-2 relative z-10">
              <button 
                onClick={() => {
                  if (onNavigate) {
                    onNavigate('articleList');
                  }
                }}
                className="bg-white/10 hover:bg-white/20 py-2 rounded text-[10px] font-bold transition-colors"
              >
                查看文章
              </button>
              <button 
                onClick={() => {
                  if (onNavigate) {
                    onNavigate('periodicalList');
                  }
                }}
                className="bg-white text-[#005bac] py-2 rounded text-[10px] font-bold transition-colors hover:bg-blue-50"
              >
                创建期刊
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};