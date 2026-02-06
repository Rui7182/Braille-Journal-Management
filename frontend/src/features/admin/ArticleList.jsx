import React, { useState, useEffect } from 'react';
import {
  Plus,
  Filter,
  Search,
  FileText,
  BookOpen,
  Activity,
  MoreVertical,
  Edit2,
  Trash2,
  CheckCircle,
  ExternalLink,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  X,
  RotateCcw,
} from 'lucide-react';
import RichTextEditor from '../../components/RichTextEditor';
import { ARTICLE_STATUS_MAP } from '../../data/mockData';
import { articleAPI } from '../../services/api';

export const ArticleList = ({ articles, setArticles, periodicals }) => {
  const [showModal, setShowModal] = useState(false);
  const [modalMenuOpen, setModalMenuOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [filterPeriodical, setFilterPeriodical] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [keyword, setKeyword] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 7;

  const [form, setForm] = useState({
    title: '',
    author: '',
    status: 'DRAFT',
    pid: '',
    content: '',
    type: '散文',
  });

  // 统计摘要
  const stats = [
    { label: '文献总数', count: articles.length, color: 'text-gray-600' },
    { label: '已发布', count: articles.filter(a => a.status === 'PUBLISHED').length, color: 'text-emerald-600' },
    { label: '审核中', count: articles.filter(a => ['REVIEWING_1', 'REVIEWING_2', 'PENDING_REVIEW_1', 'PENDING_REVIEW_2', 'PENDING_ASSIGN_1', 'PENDING_ASSIGN_2'].includes(a.status)).length, color: 'text-blue-600' },
  ];

  const filteredArticles = articles.filter(a => {
    const matchP = filterPeriodical === 'all' || a.pid === parseInt(filterPeriodical);
    const matchS = filterStatus === 'all' ? true : (filterStatus === 'review_group' ? ['REVIEWING_1', 'REVIEWING_2', 'PENDING_REVIEW_1', 'PENDING_REVIEW_2', 'PENDING_ASSIGN_1', 'PENDING_ASSIGN_2'].includes(a.status) : a.status === filterStatus);
    const matchK = !keyword || a.title.includes(keyword) || (a.author && a.author.includes(keyword));
    return matchP && matchS && matchK;
  });

  const totalPages = Math.max(1, Math.ceil(filteredArticles.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedArticles = filteredArticles.slice(startIndex, startIndex + itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [filterPeriodical, filterStatus, keyword]);

  const handleSave = async () => {
    try {
      const articleData = {
        title: form.title,
        pid: parseInt(form.pid),
        author: form.author,
        content: form.content,
        abstract: form.abstract || '',
        type: form.type || '',
        status: form.status || 'DRAFT'
      };
      
      if (editingItem) {
        // 更新文章
        const updated = await articleAPI.update(editingItem.id, articleData);
        setArticles(articles.map(a => a.id === editingItem.id ? updated : a));
      } else {
        // 创建新文章
        const newArticle = await articleAPI.create(articleData);
        setArticles([...articles, newArticle]);
      }
      setShowModal(false);
    } catch (error) {
      console.error('保存文章失败:', error);
      alert('保存失败: ' + error.message);
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setModalMenuOpen(false);
  };

  const clearFormAndClose = () => {
    setForm({
      title: '',
      author: '',
      status: 'DRAFT',
      pid: periodicals[0]?.id ?? '',
      content: '',
      type: '散文',
    });
    setEditingItem(null);
    setModalMenuOpen(false);
    setShowModal(false);
  };

  const openEditModal = (article) => {
    setEditingItem(article);
    setForm({
      title: article.title || '',
      author: article.author || article.author_original || '',
      status: article.status || 'DRAFT',
      pid: article.pid || article.periodical_id || '',
      content: article.content || article.content_text || '',
      abstract: article.abstract || article.ai_summary || '',
      type: article.type || article.category_name || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('确定要从系统中移除这篇文章吗？此操作不可撤销。')) {
      try {
        await articleAPI.delete(id);
        setArticles(articles.filter(x => x.id !== id));
      } catch (error) {
        console.error('删除文章失败:', error);
        alert('删除失败: ' + error.message);
      }
    }
  };

  const handlePublish = async (article) => {
    if (article.status !== 'READY_TO_PUBLISH') return;
    if (!window.confirm('确定要发布这篇文章吗？将自动生成 AI 摘要并正式发布。')) return;
    try {
      const res = await articleAPI.publish(article.id);
      setArticles(articles.map(a => a.id === article.id ? res.article : a));
      alert(res.message || '发布成功');
    } catch (error) {
      console.error('发布文章失败:', error);
      alert('发布失败: ' + (error.message || error.detail || '请稍后重试'));
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      {/* 顶部操作与筛选栏 - 采用更加Pro的紧凑布局 */}
      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            {stats.map((s, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{s.label}</span>
                <span className={`text-sm font-black ${s.color}`}>{s.count}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setEditingItem(null);
                setForm({ title: '', author: '待认领', status: 'DRAFT', pid: periodicals[0]?.id || '', content: '', type: '待定' });
                setShowModal(true);
              }}
              className="bg-[#005bac] text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 hover:bg-[#004a8d] transition-all shadow-sm active:scale-95"
            >
              <Plus className="h-3.5 w-3.5" />
              新增文献录入
            </button>
          </div>
        </div>

        <div className="h-px bg-gray-50"></div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
            <input
              value={keyword}
              onChange={e => setKeyword(e.target.value)}
              placeholder="通过标题、作者或关键词进行快速检索..."
              className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-100 rounded-lg text-xs outline-none focus:ring-2 focus:ring-[#005bac]/10 focus:border-[#005bac] focus:bg-white transition-all"
            />
          </div>
          
          <div className="flex items-center gap-2 bg-gray-50 p-1 rounded-lg border border-gray-100">
            <select
              value={filterPeriodical}
              onChange={e => setFilterPeriodical(e.target.value)}
              className="bg-transparent text-[11px] font-bold text-gray-600 px-3 py-1 outline-none cursor-pointer"
            >
              <option value="all">所有出版期刊</option>
              {periodicals.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
            </select>
            <div className="w-px h-4 bg-gray-200"></div>
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="bg-transparent text-[11px] font-bold text-gray-600 px-3 py-1 outline-none cursor-pointer"
            >
              <option value="all">全部状态</option>
              <option value="review_group">审核中(集合)</option>
              {Object.entries(ARTICLE_STATUS_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* 文献表格区域 */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-50">
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest w-[40%]">文献资源标题</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">作者</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">所属期刊</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">状态</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">管理操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {paginatedArticles.map(a => {
                const status = ARTICLE_STATUS_MAP[a.status] || { label: a.status, color: 'bg-gray-100 text-gray-500' };
                return (
                  <tr key={a.id} className="hover:bg-blue-50/20 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-gray-800 group-hover:text-[#005bac] transition-colors line-clamp-1">{a.title}</span>
                        <span className="text-[10px] text-gray-400 mt-1 flex items-center gap-2">
                          ID: #{a.id} <span className="w-1 h-1 rounded-full bg-gray-200"></span> {a.type}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-semibold text-gray-600">{a.author}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-[11px] text-gray-500 font-medium">
                        {periodicals.find(p => p.id === a.pid)?.title || '未关联'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black uppercase ${status.color.replace('text-', 'text-').replace('bg-', 'bg-opacity-10 bg-')}`}>
                        {status.label}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-end items-center gap-1">
                        {a.status === 'READY_TO_PUBLISH' && (
                          <button
                            onClick={() => handlePublish(a)}
                            className="inline-flex items-center gap-1 px-2 py-1.5 text-xs font-bold text-emerald-600 hover:bg-emerald-50 rounded-md transition-all"
                            title="确认发布（将生成 AI 摘要并发布）"
                          >
                            <CheckCircle className="h-3.5 w-3.5" />
                            发布
                          </button>
                        )}
                        <button 
                          onClick={() => openEditModal(a)}
                          className="p-1.5 text-gray-400 hover:text-[#005bac] hover:bg-blue-50 rounded-md transition-all"
                          title="编辑内容"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button 
                          className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition-all"
                          title="预览文献"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </button>
                        <button 
                          onClick={() => handleDelete(a.id)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-all"
                          title="移除文献"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {paginatedArticles.length === 0 && (
                <tr>
                  <td colSpan="5" className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center gap-2 opacity-20">
                      <FileText className="h-12 w-12" />
                      <span className="text-sm font-bold uppercase tracking-tighter">未检索到相关文献资源</span>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-3 border-t border-gray-50 bg-gray-50/30 flex justify-between items-center">
          <span className="text-[10px] text-gray-400 font-bold uppercase">
            共 {filteredArticles.length} 条，第 {totalPages ? currentPage : 0} / {totalPages} 页
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

      {/* 编辑/新增弹窗 - 采用更精细的网格布局 */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <h3 className="font-black text-gray-800 tracking-tight">
                {editingItem ? '编辑核心文献资源' : '录入新文献资源'}
              </h3>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setModalMenuOpen((v) => !v)}
                  className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-500 hover:text-gray-700"
                  title="更多操作"
                  aria-haspopup="true"
                  aria-expanded={modalMenuOpen}
                >
                  <MoreVertical className="h-4 w-4" />
                </button>
                {modalMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-10" aria-hidden="true" onClick={() => setModalMenuOpen(false)} />
                    <div className="absolute right-0 top-full mt-1 py-1 w-48 bg-white rounded-lg border border-gray-200 shadow-lg z-20">
                      <button
                        type="button"
                        onClick={() => { closeModal(); }}
                        className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                      >
                        <X className="h-4 w-4 text-gray-400" />
                        关闭
                      </button>
                      <button
                        type="button"
                        onClick={clearFormAndClose}
                        className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                      >
                        <RotateCcw className="h-4 w-4 text-gray-400" />
                        清空表单并关闭
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">文献标题</label>
                  <input
                    value={form.title}
                    onChange={e => setForm({ ...form, title: e.target.value })}
                    placeholder="输入完整文献标题..."
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#005bac]/10 focus:border-[#005bac] outline-none transition-all text-sm font-semibold"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">主要作者/责任人</label>
                  <input
                    value={form.author}
                    onChange={e => setForm({ ...form, author: e.target.value })}
                    placeholder="责任编辑或原作者..."
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#005bac]/10 focus:border-[#005bac] outline-none transition-all text-sm font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-6">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">所属期刊</label>
                  <div className="relative">
                    <select
                      value={form.pid}
                      onChange={e => setForm({ ...form, pid: e.target.value })}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#005bac]/10 focus:border-[#005bac] outline-none transition-all text-sm font-semibold appearance-none"
                    >
                      {periodicals.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">分类类型</label>
                  <input
                    value={form.type}
                    onChange={e => setForm({ ...form, type: e.target.value })}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#005bac]/10 focus:border-[#005bac] outline-none transition-all text-sm font-semibold"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">发布状态</label>
                  <div className="relative">
                    <select
                      value={form.status}
                      onChange={e => setForm({ ...form, status: e.target.value })}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#005bac]/10 focus:border-[#005bac] outline-none transition-all text-sm font-semibold appearance-none"
                    >
                      {Object.entries(ARTICLE_STATUS_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">文献正文内容 (盲文转换源文本)</label>
                <div className="rounded-xl overflow-hidden border border-gray-100">
                  <RichTextEditor
                    value={form.content}
                    onChange={e => setForm({ ...form, content: e.target.value })}
                    style="h-64"
                  />
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-3">
              <button
                onClick={closeModal}
                className="px-6 py-2 rounded-xl text-sm font-bold text-gray-500 hover:bg-gray-100 transition-all"
              >
                放弃更改
              </button>
              <button
                onClick={handleSave}
                className="px-6 py-2 rounded-xl text-sm font-bold text-white bg-[#005bac] hover:bg-[#004a8d] shadow-lg shadow-blue-900/10 transition-all active:scale-95"
              >
                确认并保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};