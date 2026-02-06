import React, { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  BookOpen,
  Edit2,
  Trash2,
  MoreHorizontal,
  ChevronDown,
  Ban,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { periodicalAPI } from '../../services/api';

export const PeriodicalList = ({ periodicals, setPeriodicals }) => {
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [form, setForm] = useState({
    title: '',
    year: 2025,
    issue: 1,
    issueTotal: 1,
    status: 'published',
  });

  const [filterStatus, setFilterStatus] = useState('all');
  const [filterYear, setFilterYear] = useState('all');
  const [keyword, setKeyword] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 7;

  const allYears = [...new Set(periodicals.map(p => p.year))].sort((a, b) => b - a);

  const stats = [
    { label: '期刊总数', count: periodicals.length, color: 'text-gray-600' },
    { label: '已上架', count: periodicals.filter(p => p.status === 'published').length, color: 'text-emerald-600' },
    { label: '已下架', count: periodicals.filter(p => p.status === 'archived').length, color: 'text-gray-400' },
  ];

  const filteredPeriodicals = periodicals.filter(p => {
    const matchS = filterStatus === 'all' ? true : p.status === filterStatus;
    const matchY = filterYear === 'all' || p.year === parseInt(filterYear);
    const matchK = !keyword || p.title.toLowerCase().includes(keyword.toLowerCase()) || p.year.toString().includes(keyword);
    return matchS && matchY && matchK;
  });

  const totalPages = Math.max(1, Math.ceil(filteredPeriodicals.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedPeriodicals = filteredPeriodicals.slice(startIndex, startIndex + itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [filterStatus, filterYear, keyword]);

  useEffect(() => {
    if (form.year && form.issue && form.issueTotal) {
      setForm(prev => ({
        ...prev,
        title: `${prev.year}年第${prev.issue}期 (总第${prev.issueTotal}期)`,
      }));
    }
  }, [form.year, form.issue, form.issueTotal]);

  const handleSave = async () => {
    if (!form.title) {
      alert('请填写完整信息');
      return;
    }
    try {
      const periodicalData = {
        year: form.year,
        issue: form.issue,
        issueTotal: form.issueTotal,
        title: form.title,
        status: form.status
      };
      
      if (editingItem) {
        // 更新期刊
        const updated = await periodicalAPI.update(editingItem.id, periodicalData);
        setPeriodicals(periodicals.map(p => p.id === editingItem.id ? updated : p));
      } else {
        // 创建新期刊
        const newPeriodical = await periodicalAPI.create(periodicalData);
        setPeriodicals([...periodicals, newPeriodical]);
      }
      setShowModal(false);
    } catch (error) {
      console.error('保存期刊失败:', error);
      alert('保存失败: ' + error.message);
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      {/* 顶部统计与操作栏 */}
      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          {stats.map((s, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{s.label}</span>
              <span className={`text-sm font-black ${s.color}`}>{s.count}</span>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setEditingItem(null);
              setForm({ title: '', year: 2025, issue: 1, issueTotal: 1, status: 'published' });
              setShowModal(true);
            }}
            className="px-4 py-2 bg-[#005bac] text-white rounded-lg text-xs font-bold hover:bg-[#004a8d] transition-all shadow-sm flex items-center gap-2 active:scale-95"
          >
            <Plus className="h-3.5 w-3.5" />
            新增期刊
          </button>
        </div>
      </div>

      {/* 筛选工具条 */}
      <div className="bg-white px-4 py-3 rounded-xl border border-gray-100 shadow-sm flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
          <input
            value={keyword}
            onChange={e => setKeyword(e.target.value)}
            placeholder="搜索期刊标题或年份..."
            className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-100 rounded-lg text-xs outline-none focus:ring-2 focus:ring-[#005bac]/10 focus:border-[#005bac] focus:bg-white transition-all"
          />
        </div>

        <div className="flex items-center gap-2 bg-gray-50 p-1 rounded-lg border border-gray-100">
          <select
            value={filterYear}
            onChange={e => setFilterYear(e.target.value)}
            className="bg-transparent text-[11px] font-bold text-gray-600 px-3 py-1 outline-none cursor-pointer"
          >
            <option value="all">全部年份</option>
            {allYears.map(year => <option key={year} value={year}>{year}年</option>)}
          </select>
          <div className="w-px h-4 bg-gray-200"></div>
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="bg-transparent text-[11px] font-bold text-gray-600 px-3 py-1 outline-none cursor-pointer"
          >
            <option value="all">全部状态</option>
            <option value="published">已上架</option>
            <option value="archived">已下架</option>
          </select>
        </div>
      </div>

      {/* 期刊表格 */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-50">
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">期刊标识</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest w-[35%]">期刊标题</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">年份</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">期数信息</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">发布状态</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">管理操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {paginatedPeriodicals.map(p => (
                <tr key={p.id} className="hover:bg-blue-50/20 transition-colors group">
                  <td className="px-6 py-4">
                    <span className="text-[10px] font-black text-gray-400">#{p.id}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-bold text-gray-800 group-hover:text-[#005bac] transition-colors line-clamp-1">{p.title}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs font-semibold text-gray-600">{p.year}年</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-[11px] text-gray-500 font-medium">第{p.issue}期 (总第{p.issueTotal}期)</span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                      p.status === 'published' ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {p.status === 'published' ? '已上架' : '已下架'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-end items-center gap-1">
                      <button
                        onClick={async () => {
                          const newStatus = p.status === 'published' ? 'archived' : 'published';
                          try {
                            const updated = await periodicalAPI.update(p.id, { status: newStatus });
                            setPeriodicals(periodicals.map(x => x.id === p.id ? updated : x));
                          } catch (error) {
                            console.error('更新状态失败:', error);
                            alert('操作失败: ' + error.message);
                          }
                        }}
                        className={`p-1.5 rounded-md transition-all ${
                          p.status === 'published' 
                            ? 'text-amber-500 hover:bg-amber-50' 
                            : 'text-emerald-500 hover:bg-emerald-50'
                        }`}
                        title={p.status === 'published' ? '下架期刊' : '上架期刊'}
                      >
                        {p.status === 'published' ? <Ban className="h-3.5 w-3.5" /> : <CheckCircle className="h-3.5 w-3.5" />}
                      </button>
                      <button
                        onClick={() => {
                          setEditingItem(p);
                          setForm({
                            title: p.title || '',
                            year: p.year || 2025,
                            issue: p.issue || p.issue_no || 1,
                            issueTotal: p.issueTotal || p.issue_no || 1,
                            status: p.status || 'published'
                          });
                          setShowModal(true);
                        }}
                        className="p-1.5 text-gray-400 hover:text-[#005bac] hover:bg-blue-50 rounded-md transition-all"
                        title="编辑期刊"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={async () => {
                          if (window.confirm('确定要从系统中移除该期刊吗？')) {
                            try {
                              await periodicalAPI.delete(p.id);
                              setPeriodicals(periodicals.filter(x => x.id !== p.id));
                            } catch (error) {
                              console.error('删除期刊失败:', error);
                              alert('删除失败: ' + error.message);
                            }
                          }
                        }}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-all"
                        title="删除期刊"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {paginatedPeriodicals.length === 0 && (
                <tr>
                  <td colSpan="6" className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center gap-2 opacity-20">
                      <BookOpen className="h-12 w-12" />
                      <span className="text-sm font-bold uppercase tracking-tighter">未检索到相关期刊</span>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-3 border-t border-gray-50 bg-gray-50/30 flex justify-between items-center">
          <span className="text-[10px] text-gray-400 font-bold uppercase">
            共 {filteredPeriodicals.length} 条，第 {totalPages ? currentPage : 0} / {totalPages} 页
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 text-gray-500 hover:text-[#005bac] hover:bg-blue-50 rounded disabled:opacity-40 disabled:hover:bg-transparent transition-all"
              title="上一页"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum;
              if (totalPages <= 5) pageNum = i + 1;
              else if (currentPage <= 3) pageNum = i + 1;
              else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
              else pageNum = currentPage - 2 + i;
              return (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`min-w-[28px] px-2 py-1 text-[10px] font-bold rounded transition-all ${
                    currentPage === pageNum
                      ? 'bg-[#005bac] text-white'
                      : 'text-gray-500 hover:bg-gray-100'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 text-gray-500 hover:text-[#005bac] hover:bg-blue-50 rounded disabled:opacity-40 disabled:hover:bg-transparent transition-all"
              title="下一页"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 新增/编辑弹窗 */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <h3 className="font-black text-gray-800 tracking-tight">{editingItem ? '编辑期刊信息' : '创建新期刊'}</h3>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-400">
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">出版年份</label>
                  <input
                    type="number"
                    value={form.year}
                    onChange={e => setForm({ ...form, year: Number(e.target.value) })}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#005bac]/10 focus:border-[#005bac] outline-none transition-all text-sm font-semibold"
                    placeholder="如: 2025"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">当年期数</label>
                  <input
                    type="number"
                    value={form.issue}
                    onChange={e => setForm({ ...form, issue: Number(e.target.value) })}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#005bac]/10 focus:border-[#005bac] outline-none transition-all text-sm font-semibold"
                    placeholder="如: 3"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">累计总期数</label>
                <input
                  type="number"
                  value={form.issueTotal}
                  onChange={e => setForm({ ...form, issueTotal: Number(e.target.value) })}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#005bac]/10 focus:border-[#005bac] outline-none transition-all text-sm font-semibold"
                  placeholder="如: 158"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">自动生成标题</label>
                <input
                  value={form.title}
                  readOnly
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-500 cursor-not-allowed"
                />
                <p className="text-[10px] text-gray-400 mt-1">标题将根据上述信息自动生成</p>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">发布状态</label>
                <div className="relative">
                  <select
                    value={form.status}
                    onChange={e => setForm({ ...form, status: e.target.value })}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#005bac]/10 focus:border-[#005bac] outline-none transition-all text-sm font-semibold appearance-none cursor-pointer"
                  >
                    <option value="published">已上架</option>
                    <option value="archived">已下架</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-3">
              <button onClick={() => setShowModal(false)} className="px-6 py-2 rounded-xl text-sm font-bold text-gray-500 hover:bg-gray-100 transition-all">取消</button>
              <button onClick={handleSave} className="px-6 py-2 rounded-xl text-sm font-bold text-white bg-[#005bac] hover:bg-[#004a8d] shadow-lg shadow-blue-900/10 transition-all active:scale-95">保存设置</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};