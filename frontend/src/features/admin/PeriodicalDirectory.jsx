import React, { useState, useEffect } from 'react';
import {
  Plus,
  FileSpreadsheet,
  List,
  Library,
  Search,
  BookOpen,
  FileText,
  Edit2,
  Trash2,
  Download,
  MoreHorizontal,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { ARTICLE_STATUS_MAP } from '../../data/mockData';
import { articleAPI, periodicalAPI } from '../../services/api';

export const PeriodicalDirectory = ({ periodicals, setPeriodicals, articles, setArticles }) => {
  const [selectedPeriodicalId, setSelectedPeriodicalId] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [showBatchExcel, setShowBatchExcel] = useState(false);
  const [showBatchText, setShowBatchText] = useState(false);
  const [batchTextContent, setBatchTextContent] = useState('');
  const [newPData, setNewPData] = useState({ year: 2025, issue: '', issueTotal: '', title: '' });

  const [searchKeyword, setSearchKeyword] = useState('');
  const [filterYear, setFilterYear] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [currentPagePeriodicals, setCurrentPagePeriodicals] = useState(1);
  const [currentPageDirectory, setCurrentPageDirectory] = useState(1);
  const itemsPerPage = 7;           // 左侧期刊列表每页 7 条
  const itemsPerPageDirectory = 8;  // 右侧目录管理每页 8 条

  const allYears = [...new Set(periodicals.map(p => p.year))].sort((a, b) => b - a);

  const filteredPeriodicals = periodicals.filter(p => {
    const matchKeyword = !searchKeyword || p.title.toLowerCase().includes(searchKeyword.toLowerCase());
    const matchYear = filterYear === 'all' || p.year === parseInt(filterYear);
    const matchStatus = filterStatus === 'all' || p.status === filterStatus;
    return matchKeyword && matchYear && matchStatus;
  });

  const totalPagesPeriodicals = Math.max(1, Math.ceil(filteredPeriodicals.length / itemsPerPage));
  const startPeriodicals = (currentPagePeriodicals - 1) * itemsPerPage;
  const paginatedPeriodicals = filteredPeriodicals.slice(startPeriodicals, startPeriodicals + itemsPerPage);

  const currentDirectoryItems = selectedPeriodicalId ? articles.filter(a => a.pid === selectedPeriodicalId) : [];
  const totalPagesDirectory = Math.max(1, Math.ceil(currentDirectoryItems.length / itemsPerPageDirectory));
  const startDirectory = (currentPageDirectory - 1) * itemsPerPageDirectory;
  const paginatedDirectoryItems = currentDirectoryItems.slice(startDirectory, startDirectory + itemsPerPageDirectory);

  useEffect(() => {
    setCurrentPagePeriodicals(1);
  }, [searchKeyword, filterYear, filterStatus]);

  useEffect(() => {
    setCurrentPageDirectory(1);
  }, [selectedPeriodicalId]);
  const currentPeriodical = periodicals.find(p => p.id === selectedPeriodicalId);

  const stats = [
    { label: '期刊总数', count: periodicals.length },
    { label: '已发布', count: periodicals.filter(p => p.status === 'published').length },
    { label: '目录条目', count: articles.length },
  ];

  useEffect(() => {
    if (newPData.year && newPData.issue && newPData.issueTotal) {
      setNewPData(prev => ({
        ...prev,
        title: `${prev.year}年第${prev.issue}期 (总第${prev.issueTotal}期)`,
      }));
    }
  }, [newPData.year, newPData.issue, newPData.issueTotal]);

  const handleCreate = async () => {
    if (!newPData.title) return;
    try {
      const newP = await periodicalAPI.create({
        ...newPData,
        status: 'published',
      });
      setPeriodicals([...periodicals, newP]);
      setIsCreating(false);
      setSelectedPeriodicalId(newP.id);
      setNewPData({ year: 2025, issue: '', issueTotal: '', title: '' });
    } catch (error) {
      console.error('创建期刊失败:', error);
      alert('创建失败: ' + error.message);
    }
  };

  const handleAddSingleItem = async () => {
    if (!selectedPeriodicalId) return alert('请先选择左侧期刊！');
    try {
      const newArticle = await articleAPI.create({
        title: '新条目',
        pid: selectedPeriodicalId,
        author: '待认领',
        status: 'DRAFT',
        type: '待定',
        content: '',
        abstract: ''
      });
      setArticles([...articles, newArticle]);
    } catch (error) {
      console.error('添加条目失败:', error);
      alert('添加失败: ' + error.message);
    }
  };

  const handleDeleteItem = async (itemId) => {
    if (window.confirm('确定要删除这个目录条目吗？')) {
      try {
        await articleAPI.delete(itemId);
        setArticles(articles.filter(a => a.id !== itemId));
      } catch (error) {
        console.error('删除条目失败:', error);
        alert('删除失败: ' + error.message);
      }
    }
  };

  const handleEditItem = async (item) => {
    const newTitle = window.prompt('请输入新的标题：', item.title);
    if (newTitle && newTitle.trim()) {
      try {
        const updated = await articleAPI.update(item.id, {
          title: newTitle.trim(),
          pid: item.pid || item.periodical_id,
          author: item.author || item.author_original || '',
          status: item.status || 'DRAFT',
          type: item.type || item.category_name || '',
          content: item.content || item.content_text || '',
          abstract: item.abstract || item.ai_summary || ''
        });
        setArticles(articles.map(a => a.id === item.id ? updated : a));
      } catch (error) {
        console.error('更新条目失败:', error);
        alert('更新失败: ' + error.message);
      }
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
              <span className="text-sm font-black text-gray-800">{s.count}</span>
            </div>
          ))}
        </div>
        <button
          onClick={() => setShowBatchExcel(true)}
          className="px-4 py-2 bg-gray-50 text-gray-600 rounded-lg text-xs font-bold border border-gray-200 hover:bg-gray-100 transition-all flex items-center gap-2"
        >
          <FileSpreadsheet className="h-3.5 w-3.5" />
          Excel 批量导入
        </button>
      </div>

      {/* 主要内容区域：左右分栏 */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* 左侧：期刊列表 */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm flex flex-col h-[calc(100vh-240px)]">
            <div className="p-4 border-b border-gray-50 space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-sm text-gray-800 flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-[#005bac]" />
                  期刊列表
                </h3>
                <button
                  onClick={() => setIsCreating(true)}
                  className="p-1.5 bg-blue-50 text-[#005bac] rounded-lg hover:bg-blue-100 transition-colors"
                  title="创建新期刊"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-gray-400" />
                  <input
                    value={searchKeyword}
                    onChange={e => setSearchKeyword(e.target.value)}
                    placeholder="搜索期刊..."
                    className="w-full pl-8 pr-2 py-1.5 bg-gray-50 border border-gray-100 rounded-lg text-xs outline-none focus:ring-2 focus:ring-[#005bac]/10 focus:border-[#005bac] transition-all"
                  />
                </div>
                <div className="flex gap-2">
                  <select
                    value={filterYear}
                    onChange={e => setFilterYear(e.target.value)}
                    className="flex-1 border border-gray-100 px-2 py-1.5 rounded-lg text-xs outline-none focus:ring-2 focus:ring-[#005bac]/10 bg-gray-50"
                  >
                    <option value="all">全部年份</option>
                    {allYears.map(year => <option key={year} value={year}>{year}年</option>)}
                  </select>
                  <select
                    value={filterStatus}
                    onChange={e => setFilterStatus(e.target.value)}
                    className="flex-1 border border-gray-100 px-2 py-1.5 rounded-lg text-xs outline-none focus:ring-2 focus:ring-[#005bac]/10 bg-gray-50"
                  >
                    <option value="all">全部状态</option>
                    <option value="published">已上架</option>
                    <option value="archived">已下架</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-2">
              {paginatedPeriodicals.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-xs">暂无期刊</div>
              ) : (
                paginatedPeriodicals.map(p => {
                  const itemCount = articles.filter(a => a.pid === p.id).length;
                  return (
                    <div
                      key={p.id}
                      onClick={() => setSelectedPeriodicalId(p.id)}
                      className={`p-3 rounded-lg border cursor-pointer transition-all ${
                        selectedPeriodicalId === p.id
                          ? 'bg-[#005bac]/5 border-[#005bac] text-[#005bac] font-semibold shadow-sm'
                          : 'border-gray-100 hover:bg-gray-50 text-gray-700'
                      }`}
                    >
                      <div className="font-semibold text-xs mb-1 line-clamp-1">{p.title}</div>
                      <div className="flex items-center justify-between text-[10px] text-gray-400">
                        <span>{p.year}年</span>
                        <span className="flex items-center gap-1">
                          <FileText className="h-3 w-3" />
                          {itemCount}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            {totalPagesPeriodicals > 1 && (
              <div className="px-3 py-2 border-t border-gray-50 bg-gray-50/30 flex justify-between items-center">
                <span className="text-[10px] text-gray-400 font-bold">第 {currentPagePeriodicals} / {totalPagesPeriodicals} 页</span>
                <div className="flex items-center gap-0.5">
                  <button
                    onClick={() => setCurrentPagePeriodicals(p => Math.max(1, p - 1))}
                    disabled={currentPagePeriodicals === 1}
                    className="p-1 text-gray-500 hover:text-[#005bac] rounded disabled:opacity-40"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => setCurrentPagePeriodicals(p => Math.min(totalPagesPeriodicals, p + 1))}
                    disabled={currentPagePeriodicals === totalPagesPeriodicals}
                    className="p-1 text-gray-500 hover:text-[#005bac] rounded disabled:opacity-40"
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 右侧：目录管理 */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm flex flex-col h-[calc(100vh-240px)]">
            {isCreating ? (
              <div className="p-6">
                <div className="max-w-md mx-auto w-full space-y-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-black text-gray-800 tracking-tight">创建新期刊</h3>
                    <button onClick={() => { setIsCreating(false); setNewPData({ year: 2025, issue: '', issueTotal: '', title: '' }); }} className="text-gray-400 hover:text-gray-600">×</button>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">年份</label>
                      <input type="number" value={newPData.year} onChange={e => setNewPData({ ...newPData, year: e.target.value })} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#005bac]/10 focus:border-[#005bac] outline-none transition-all text-sm font-semibold" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">当年期数</label>
                      <input type="number" value={newPData.issue} onChange={e => setNewPData({ ...newPData, issue: e.target.value })} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#005bac]/10 focus:border-[#005bac] outline-none transition-all text-sm font-semibold" placeholder="如: 3" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">总期数</label>
                    <input type="number" value={newPData.issueTotal} onChange={e => setNewPData({ ...newPData, issueTotal: e.target.value })} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#005bac]/10 focus:border-[#005bac] outline-none transition-all text-sm font-semibold" placeholder="如: 158" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">生成标题</label>
                    <input value={newPData.title} readOnly className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-500 cursor-not-allowed" />
                  </div>
                  <div className="flex gap-2 pt-4">
                    <button onClick={() => { setIsCreating(false); setNewPData({ year: 2025, issue: '', issueTotal: '', title: '' }); }} className="flex-1 bg-gray-100 py-2.5 rounded-xl hover:bg-gray-200 text-xs font-bold transition-all">取消</button>
                    <button onClick={handleCreate} className="flex-1 bg-[#005bac] text-white py-2.5 rounded-xl hover:bg-[#004a8d] shadow-lg shadow-blue-900/10 text-xs font-bold transition-all active:scale-95">创建</button>
                  </div>
                </div>
              </div>
            ) : selectedPeriodicalId ? (
              <>
                <div className="p-4 border-b border-gray-50 flex items-center justify-between bg-gray-50/30">
                  <div>
                    <h2 className="font-black text-gray-800 text-sm">{currentPeriodical?.title || '目录管理'}</h2>
                    <p className="text-[10px] text-gray-400 mt-1 font-bold uppercase tracking-tighter">共 {currentDirectoryItems.length} 个目录条目{totalPagesDirectory > 1 ? `，第 ${currentPageDirectory}/${totalPagesDirectory} 页` : ''}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setShowBatchText(true)} className="bg-purple-50 text-purple-700 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 hover:bg-purple-100 transition-all">
                      <List className="h-3.5 w-3.5" />
                      批量文本添加
                    </button>
                    <button onClick={handleAddSingleItem} className="bg-[#005bac] text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 hover:bg-[#004a8d] shadow-sm transition-all">
                      <Plus className="h-3.5 w-3.5" />
                      添加单条
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                  {currentDirectoryItems.length === 0 ? (
                    <div className="text-gray-400 text-center py-20 flex flex-col items-center">
                      <List className="h-16 w-16 mb-4 text-gray-200" />
                      <p className="text-xs font-bold uppercase tracking-tighter">暂无目录条目，请添加</p>
                    </div>
                  ) : (
                    <>
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-gray-50/50 border-b border-gray-50 sticky top-0">
                        <tr>
                          <th className="px-6 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest w-16">序号</th>
                          <th className="px-6 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">标题</th>
                          <th className="px-6 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">作者</th>
                          <th className="px-6 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">类型</th>
                          <th className="px-6 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">状态</th>
                          <th className="px-6 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">管理操作</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {paginatedDirectoryItems.map((a, i) => {
                          const status = ARTICLE_STATUS_MAP[a.status] || { label: a.status, color: 'bg-gray-100 text-gray-500' };
                          const displayIndex = startDirectory + i + 1;
                          return (
                            <tr key={a.id} className="hover:bg-blue-50/20 transition-colors group">
                              <td className="px-6 py-4 text-gray-500 font-black text-xs">{displayIndex}</td>
                              <td className="px-6 py-4 font-bold text-sm text-gray-800 group-hover:text-[#005bac] transition-colors">{a.title}</td>
                              <td className="px-6 py-4 text-xs font-semibold text-gray-600">{a.author}</td>
                              <td className="px-6 py-4 text-[11px] text-gray-500 font-medium">{a.type || '-'}</td>
                              <td className="px-6 py-4 text-center">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black uppercase ${status.color}`}>
                                  {status.label}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex justify-end items-center gap-1">
                                  <button onClick={() => handleEditItem(a)} className="p-1.5 text-gray-400 hover:text-[#005bac] hover:bg-blue-50 rounded-md transition-all" title="编辑">
                                    <Edit2 className="h-3.5 w-3.5" />
                                  </button>
                                  <button onClick={() => handleDeleteItem(a.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-all" title="删除">
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    {totalPagesDirectory > 1 && (
                      <div className="px-6 py-3 border-t border-gray-50 bg-gray-50/30 flex justify-between items-center">
                        <span className="text-[10px] text-gray-400 font-bold uppercase">
                          共 {currentDirectoryItems.length} 条，第 {currentPageDirectory} / {totalPagesDirectory} 页
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setCurrentPageDirectory(p => Math.max(1, p - 1))}
                            disabled={currentPageDirectory === 1}
                            className="p-1.5 text-gray-500 hover:text-[#005bac] hover:bg-blue-50 rounded disabled:opacity-40"
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </button>
                          {Array.from({ length: Math.min(5, totalPagesDirectory) }, (_, i) => {
                            let pageNum;
                            if (totalPagesDirectory <= 5) pageNum = i + 1;
                            else if (currentPageDirectory <= 3) pageNum = i + 1;
                            else if (currentPageDirectory >= totalPagesDirectory - 2) pageNum = totalPagesDirectory - 4 + i;
                            else pageNum = currentPageDirectory - 2 + i;
                            return (
                              <button
                                key={pageNum}
                                onClick={() => setCurrentPageDirectory(pageNum)}
                                className={`min-w-[28px] px-2 py-1 text-[10px] font-bold rounded transition-all ${
                                  currentPageDirectory === pageNum ? 'bg-[#005bac] text-white' : 'text-gray-500 hover:bg-gray-100'
                                }`}
                              >
                                {pageNum}
                              </button>
                            );
                          })}
                          <button
                            onClick={() => setCurrentPageDirectory(p => Math.min(totalPagesDirectory, p + 1))}
                            disabled={currentPageDirectory === totalPagesDirectory}
                            className="p-1.5 text-gray-500 hover:text-[#005bac] hover:bg-blue-50 rounded disabled:opacity-40"
                          >
                            <ChevronRight className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    )}
                    </>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400 flex-col p-12">
                <Library className="h-20 w-20 mb-4 text-gray-200" />
                <p className="text-xs font-bold uppercase tracking-tighter">请从左侧选择一个期刊进行管理</p>
                <p className="text-[10px] text-gray-400 mt-2">或点击 + 按钮创建新期刊</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Excel 批量导入弹窗 */}
      {showBatchExcel && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <h3 className="font-black text-gray-800 tracking-tight">Excel 批量导入期刊目录</h3>
              <button onClick={() => setShowBatchExcel(false)} className="text-gray-400 hover:text-gray-600">×</button>
            </div>
            <div className="p-8 text-center space-y-6">
              <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto">
                <FileSpreadsheet className="h-8 w-8" />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-700">请选择包含目录信息的 Excel 文件</p>
                <p className="text-[11px] text-gray-400 mt-1">支持 .xlsx, .xls 格式</p>
              </div>
              <div className="flex flex-col gap-2">
                <button className="w-full py-3 bg-[#005bac] text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-900/10 hover:bg-[#004a8d] transition-all">选择本地文件</button>
                <button onClick={() => alert('目录模板下载成功！')} className="w-full py-3 bg-gray-50 text-gray-500 rounded-xl text-xs font-bold border border-gray-100 hover:bg-gray-100 transition-all flex items-center justify-center gap-2">
                  <Download className="h-3.5 w-3.5" />
                  下载目录导入模板
                </button>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-3">
              <button onClick={() => setShowBatchExcel(false)} className="px-6 py-2 rounded-xl text-sm font-bold text-gray-500 hover:bg-gray-100 transition-all">取消</button>
              <button onClick={() => { alert('模拟解析 Excel...\n成功添加 3 个期刊和 20 篇文章目录！'); setShowBatchExcel(false); }} className="px-6 py-2 rounded-xl text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-lg transition-all active:scale-95">确认导入</button>
            </div>
          </div>
        </div>
      )}

      {/* 批量文本添加弹窗 */}
      {showBatchText && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <h3 className="font-black text-gray-800 tracking-tight">批量添加目录条目</h3>
              <button onClick={() => setShowBatchText(false)} className="text-gray-400 hover:text-gray-600">×</button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-[11px] text-gray-500 font-medium">请在下方输入文章标题，一行一个标题。将自动创建为待认领状态。</p>
              <textarea
                className="w-full h-64 border border-gray-200 rounded-xl p-4 font-mono text-xs outline-none focus:ring-2 focus:ring-[#005bac]/10 focus:border-[#005bac] bg-gray-50 transition-all"
                value={batchTextContent}
                onChange={e => setBatchTextContent(e.target.value)}
                placeholder={`示例：\n春天的故事\n科技与未来\n盲人数字化阅读`}
              />
            </div>
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-3">
              <button onClick={() => setShowBatchText(false)} className="px-6 py-2 rounded-xl text-sm font-bold text-gray-500 hover:bg-gray-100 transition-all">取消</button>
              <button onClick={async () => {
                if (!selectedPeriodicalId) return;
                const lines = batchTextContent.split('\n').filter(l => l.trim());
                if (lines.length === 0) {
                  alert('请输入至少一个标题');
                  return;
                }
                try {
                  const promises = lines.map(title => 
                    articleAPI.create({
                      title: title.trim(),
                      pid: selectedPeriodicalId,
                      author: '待认领',
                      status: 'DRAFT',
                      type: '待定',
                      content: '',
                      abstract: ''
                    })
                  );
                  const newItems = await Promise.all(promises);
                  setArticles([...articles, ...newItems]);
                  setBatchTextContent('');
                  setShowBatchText(false);
                  alert(`成功批量添加 ${newItems.length} 个条目！`);
                } catch (error) {
                  console.error('批量添加失败:', error);
                  alert('批量添加失败: ' + error.message);
                }
              }} className="px-6 py-2 rounded-xl text-sm font-bold text-white bg-[#005bac] hover:bg-[#004a8d] shadow-lg shadow-blue-900/10 transition-all active:scale-95">确认添加</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};