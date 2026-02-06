import React, { useState, useEffect } from 'react';
import {
  FileText,
  Search,
  CheckCircle,
  XCircle,
  User,
  BookOpen,
} from 'lucide-react';
import { accessApplicationsAPI } from '../../services/api';

export const AccessApplicationList = () => {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [keyword, setKeyword] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [rejectingId, setRejectingId] = useState(null);

  const fetchApplications = async () => {
    try {
      setLoading(true);
      const data = await accessApplicationsAPI.getAll();
      const list = Array.isArray(data) ? data : (data.results || []);
      setApplications(list);
    } catch (error) {
      console.error('获取申请列表失败:', error);
      setApplications([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, []);

  const filteredApplications = applications.filter(app => {
    const matchStatus = filterStatus === 'all' || String(app.status) === filterStatus;
    const matchKeyword = !keyword ||
      (app.user_name && app.user_name.toLowerCase().includes(keyword.toLowerCase())) ||
      (app.user_phone && app.user_phone.includes(keyword)) ||
      (app.article_title && app.article_title.toLowerCase().includes(keyword.toLowerCase())) ||
      (app.reason && app.reason.toLowerCase().includes(keyword.toLowerCase()));
    return matchStatus && matchKeyword;
  });

  const handleApprove = async (id) => {
    try {
      await accessApplicationsAPI.approve(id);
      await fetchApplications();
    } catch (error) {
      console.error('同意申请失败:', error);
      alert('操作失败: ' + error.message);
    }
  };

  const handleReject = async (id) => {
    const reason = rejectingId === id ? rejectReason : '';
    try {
      await accessApplicationsAPI.reject(id, reason);
      setRejectingId(null);
      setRejectReason('');
      await fetchApplications();
    } catch (error) {
      console.error('拒绝申请失败:', error);
      alert('操作失败: ' + error.message);
    }
  };

  const pendingCount = applications.filter(a => a.status === 0 || a.status === null).length;
  const stats = [
    { label: '全部', count: applications.length, value: 'all' },
    { label: '待审', count: pendingCount, value: '0' },
    { label: '已通过', count: applications.filter(a => a.status === 1).length, value: '1' },
    { label: '已拒绝', count: applications.filter(a => a.status === 2).length, value: '2' },
  ];

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          {stats.map((s) => (
            <div key={s.value} className="flex items-center gap-2">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{s.label}</span>
              <span className="text-sm font-black text-gray-800">{s.count}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white px-4 py-3 rounded-xl border border-gray-100 shadow-sm flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
          <input
            value={keyword}
            onChange={e => setKeyword(e.target.value)}
            placeholder="搜索申请人、文章标题或理由..."
            className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-100 rounded-lg text-xs outline-none focus:ring-2 focus:ring-[#005bac]/10 focus:border-[#005bac] focus:bg-white transition-all"
          />
        </div>
        <div className="flex items-center gap-2 bg-gray-50 p-1 rounded-lg border border-gray-100">
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="bg-transparent text-[11px] font-bold text-gray-600 px-3 py-1 outline-none cursor-pointer"
          >
            <option value="all">全部状态</option>
            <option value="0">待审</option>
            <option value="1">已通过</option>
            <option value="2">已拒绝</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-50">
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">申请人</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">申请文章</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest w-[25%]">申请理由</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">申请时间</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">状态</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-sm text-gray-400">
                    加载中...
                  </td>
                </tr>
              ) : filteredApplications.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center gap-2 opacity-60">
                      <FileText className="h-12 w-12 text-gray-300" />
                      <span className="text-sm font-bold uppercase tracking-tighter text-gray-400">暂无申请记录</span>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredApplications.map(app => (
                  <tr key={app.id} className="hover:bg-blue-50/20 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                          <User className="h-4 w-4 text-gray-400" />
                        </div>
                        <div>
                          <div className="text-sm font-bold text-gray-800">{app.user_name || '—'}</div>
                          <div className="text-[10px] text-gray-400">{app.user_phone || '—'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <BookOpen className="h-4 w-4 text-gray-400 flex-shrink-0" />
                        <span className="text-sm font-medium text-gray-700 line-clamp-2">{app.article_title || '—'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs text-gray-500 line-clamp-2">{app.reason || '—'}</span>
                    </td>
                    <td className="px-6 py-4 text-[11px] text-gray-500">
                      {app.created_at_display || app.created_at || '—'}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                        app.status === 0 || app.status === null
                          ? 'bg-amber-50 text-amber-600'
                          : app.status === 1
                            ? 'bg-emerald-50 text-emerald-600'
                            : 'bg-gray-100 text-gray-500'
                      }`}>
                        {app.status_display || '待审'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-end items-center gap-1">
                        {(app.status === 0 || app.status === null) && (
                          <>
                            <button
                              onClick={() => handleApprove(app.id)}
                              className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-md transition-all"
                              title="同意"
                            >
                              <CheckCircle className="h-3.5 w-3.5" />
                            </button>
                            {rejectingId !== app.id ? (
                              <button
                                onClick={() => setRejectingId(app.id)}
                                className="p-1.5 text-red-500 hover:bg-red-50 rounded-md transition-all"
                                title="拒绝"
                              >
                                <XCircle className="h-3.5 w-3.5" />
                              </button>
                            ) : (
                              <div className="flex items-center gap-1">
                                <input
                                  type="text"
                                  placeholder="拒绝原因（选填）"
                                  value={rejectReason}
                                  onChange={e => setRejectReason(e.target.value)}
                                  className="w-32 px-2 py-1 text-xs border border-gray-200 rounded focus:ring-1 focus:ring-[#005bac] outline-none"
                                />
                                <button
                                  onClick={() => handleReject(app.id)}
                                  className="p-1.5 bg-red-500 text-white rounded-md text-xs font-bold"
                                >
                                  确认
                                </button>
                                <button
                                  onClick={() => { setRejectingId(null); setRejectReason(''); }}
                                  className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-md"
                                >
                                  取消
                                </button>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-3 border-t border-gray-50 bg-gray-50/30">
          <span className="text-[10px] text-gray-400 font-bold uppercase">共 {filteredApplications.length} 条记录</span>
        </div>
      </div>
    </div>
  );
};
