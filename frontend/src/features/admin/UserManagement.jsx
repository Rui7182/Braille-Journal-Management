import React, { useState, useEffect } from 'react';
import {
  Plus,
  FileSpreadsheet,
  Download,
  Search,
  Edit2,
  Trash2,
  Ban,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';
import { userAPI } from '../../services/api';

export const UserManagement = ({ users, setUsers }) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    password: '',
    role: 'volunteer',
    status: 'active',
  });

  const [filterRole, setFilterRole] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [keyword, setKeyword] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 7;
  const [importFile, setImportFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);

  const activeUsers = users.filter(u => !u.deleted);
  
  const filteredUsers = activeUsers.filter(u => {
    const matchRole = filterRole === 'all' || u.role === filterRole;
    const matchStatus = filterStatus === 'all' || u.status === filterStatus;
    const matchKeyword = !keyword || (u.name && u.name.toLowerCase().includes(keyword.toLowerCase())) || (u.phone && u.phone.includes(keyword)) || (u.username && u.username.toLowerCase().includes(keyword.toLowerCase()));
    return matchRole && matchStatus && matchKeyword;
  });

  // 分页计算
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

  // 当筛选条件改变时，重置到第一页
  useEffect(() => {
    setCurrentPage(1);
  }, [filterRole, filterStatus, keyword]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.phone || !formData.phone.trim()) {
      alert('请填写手机号');
      return;
    }
    if (!editingUser && (!formData.password || formData.password.length < 6)) {
      alert('新建用户请设置至少 6 位初始密码');
      return;
    }
    try {
      const userData = {
        name: formData.name,
        phone: formData.phone.trim(),
        role: formData.role,
        status: formData.status
      };
      if (!editingUser && formData.password) {
        userData.password = formData.password;
      }
      if (editingUser) {
        const updated = await userAPI.update(editingUser.id, userData);
        setUsers(users.map(u => u.id === editingUser.id ? updated : u));
      } else {
        const newUser = await userAPI.create(userData);
        setUsers([...users, newUser]);
      }
      setShowAddModal(false);
    } catch (error) {
      console.error('保存用户失败:', error);
      alert('保存失败: ' + error.message);
    }
  };

  const handleSoftDelete = async (id) => {
    if (window.confirm('确定注销该用户账号吗？注销后该用户将无法访问系统。')) {
      try {
        await userAPI.delete(id);
        setUsers(users.filter(u => u.id !== id));
      } catch (error) {
        console.error('删除用户失败:', error);
        alert('删除失败: ' + error.message);
      }
    }
  };

  const toggleStatus = async (id) => {
    try {
      const result = await userAPI.toggleStatus(id);
      setUsers(users.map(u => u.id === id ? { ...u, status: result.status } : u));
    } catch (error) {
      console.error('切换用户状态失败:', error);
      alert('操作失败: ' + error.message);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.name.match(/\.(xlsx|xls)$/i)) {
        alert('请选择Excel文件（.xlsx 或 .xls 格式）');
        return;
      }
      setImportFile(file);
      setImportResult(null);
    }
  };

  const handleBatchImport = async () => {
    if (!importFile) {
      alert('请先选择要导入的Excel文件');
      return;
    }

    setImporting(true);
    try {
      const result = await userAPI.batchImport(importFile);
      setImportResult(result);
      
      if (result.success_count > 0) {
        // 重新获取用户列表
        const updatedUsers = await userAPI.getAll();
        const usersList = Array.isArray(updatedUsers) ? updatedUsers : (updatedUsers.results || []);
        setUsers(usersList);
      }
      
      // 显示结果
      const message = result.message || `成功导入 ${result.success_count} 条，失败 ${result.error_count} 条`;
      alert(message);
      
      if (result.error_count === 0) {
        setShowBatchModal(false);
        setImportFile(null);
        setImportResult(null);
      }
    } catch (error) {
      console.error('批量导入失败:', error);
      alert('导入失败: ' + error.message);
      setImportResult({
        success: false,
        error: error.message
      });
    } finally {
      setImporting(false);
    }
  };

  const downloadTemplate = () => {
    // 创建模板数据
    const templateData = [
      {
        username: '示例用户1',
        phone: '13800138001',
        real_name: '张三',
        role_type: 2,
        status: 1
      },
      {
        username: '示例用户2',
        phone: '13800138002',
        real_name: '李四',
        role_type: 2,
        status: 1
      }
    ];

    // 转换为CSV格式（简单实现，实际可以使用xlsx库）
    const headers = ['username', 'phone', 'real_name', 'role_type', 'status'];
    const csvContent = [
      headers.join(','),
      ...templateData.map(row => headers.map(header => row[header] || '').join(','))
    ].join('\n');

    // 创建下载链接
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', '用户导入模板.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      {/* 顶部统计与操作栏 */}
      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">用户总量</span>
            <span className="text-lg font-black text-gray-800">{activeUsers.length}</span>
          </div>
          <div className="w-px h-8 bg-gray-100"></div>
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">管理员</span>
            <span className="text-lg font-black text-purple-600">{activeUsers.filter(u => u.role === 'admin').length}</span>
          </div>
          <div className="w-px h-8 bg-gray-100"></div>
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">志愿者</span>
            <span className="text-lg font-black text-blue-600">{activeUsers.filter(u => u.role === 'volunteer').length}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowBatchModal(true)}
            className="px-4 py-2 bg-gray-50 text-gray-600 rounded-lg text-xs font-bold border border-gray-200 hover:bg-gray-100 transition-all flex items-center gap-2"
          >
            <FileSpreadsheet className="h-3.5 w-3.5" />
            批量导入
          </button>
          <button
            onClick={() => {
              setEditingUser(null);
              setFormData({ name: '', phone: '', password: '', role: 'volunteer', status: 'active' });
              setShowAddModal(true);
            }}
            className="px-4 py-2 bg-[#005bac] text-white rounded-lg text-xs font-bold hover:bg-[#004a8d] transition-all shadow-sm flex items-center gap-2"
          >
            <Plus className="h-3.5 w-3.5" />
            新增系统用户
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
            placeholder="搜索姓名或手机号..."
            className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-100 rounded-lg text-xs outline-none focus:ring-2 focus:ring-[#005bac]/10 focus:border-[#005bac] focus:bg-white transition-all"
          />
        </div>

        <div className="flex items-center gap-2 bg-gray-50 p-1 rounded-lg border border-gray-100">
          <select
            value={filterRole}
            onChange={e => setFilterRole(e.target.value)}
            className="bg-transparent text-[11px] font-bold text-gray-600 px-3 py-1 outline-none cursor-pointer"
          >
            <option value="all">所有角色</option>
            <option value="admin">管理员</option>
            <option value="volunteer">志愿者</option>
          </select>
          <div className="w-px h-4 bg-gray-200"></div>
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="bg-transparent text-[11px] font-bold text-gray-600 px-3 py-1 outline-none cursor-pointer"
          >
            <option value="all">全部状态</option>
            <option value="active">正常可用</option>
            <option value="banned">已禁用</option>
          </select>
        </div>
      </div>

      {/* 用户表格 */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50/50 border-b border-gray-50">
              <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">用户信息</th>
              <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">系统角色</th>
              <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">联系电话</th>
              <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">当前状态</th>
              <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">管理操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {paginatedUsers.map(u => (
              <tr key={u.id} className="hover:bg-blue-50/20 transition-colors group">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-black text-gray-400 group-hover:bg-[#005bac] group-hover:text-white transition-all">
                      {(u.name || u.real_name || u.phone || '?').slice(0, 1)}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-gray-800">{u.name || u.real_name || '—'}</span>
                      <span className="text-[10px] text-gray-400 font-medium">{u.phone}</span>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                    u.role === 'admin' ? 'bg-purple-50 text-purple-600' : 'bg-blue-50 text-blue-600'
                  }`}>
                    {u.role === 'admin' ? '管理员' : '志愿者'}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className="text-xs font-semibold text-gray-600">{u.phone}</span>
                </td>
                <td className="px-6 py-4 text-center">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                    u.status === 'active' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
                  }`}>
                    {u.status === 'active' ? '可用' : '禁用'}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex justify-end items-center gap-1">
                    <button 
                      onClick={() => { 
                        setEditingUser(u); 
                        setFormData({
                          name: u.name || u.real_name || '',
                          phone: u.phone || '',
                          password: '',
                          role: u.role || 'volunteer',
                          status: u.status || 'active'
                        }); 
                        setShowAddModal(true); 
                      }}
                      className="p-1.5 text-gray-400 hover:text-[#005bac] hover:bg-blue-50 rounded-md transition-all"
                      title="编辑资料"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button 
                      onClick={() => toggleStatus(u.id)}
                      className={`p-1.5 text-gray-400 rounded-md transition-all ${u.status === 'active' ? 'hover:text-amber-600 hover:bg-amber-50' : 'hover:text-green-600 hover:bg-green-50'}`}
                      title={u.status === 'active' ? '禁用账号' : '启用账号'}
                    >
                      {u.status === 'active' ? <Ban className="h-3.5 w-3.5" /> : <CheckCircle className="h-3.5 w-3.5" />}
                    </button>
                    <button 
                      onClick={() => handleSoftDelete(u.id)}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-all"
                      title="注销用户"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 分页控件 */}
      {totalPages > 1 && (
        <div className="bg-white px-6 py-4 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div className="text-[10px] text-gray-400 font-bold uppercase">
            显示第 {startIndex + 1}-{Math.min(endIndex, filteredUsers.length)} 条，共 {filteredUsers.length} 条记录
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className={`p-2 rounded-lg border transition-all ${
                currentPage === 1
                  ? 'bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed'
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:border-[#005bac]'
              }`}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                      currentPage === pageNum
                        ? 'bg-[#005bac] text-white shadow-sm'
                        : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 hover:border-[#005bac]'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>
            
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className={`p-2 rounded-lg border transition-all ${
                currentPage === totalPages
                  ? 'bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed'
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:border-[#005bac]'
              }`}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* 新增/编辑弹窗 */}
      {showAddModal && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <h3 className="font-black text-gray-800 tracking-tight">{editingUser ? '编辑用户信息' : '创建新系统用户'}</h3>
              <button onClick={() => setShowAddModal(false)} className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors" title="关闭">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">手机号（登录账号）</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="请输入11位手机号，用于登录"
                  required
                  readOnly={!!editingUser}
                  className={`w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#005bac]/10 focus:border-[#005bac] outline-none transition-all text-sm font-semibold ${editingUser ? 'cursor-not-allowed text-gray-500' : ''}`}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">真实姓名</label>
                <input
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="请输入真实姓名"
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#005bac]/10 focus:border-[#005bac] outline-none transition-all text-sm font-semibold"
                />
              </div>
              {!editingUser && (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">初始密码</label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                    placeholder="至少6位，用于该用户首次登录"
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#005bac]/10 focus:border-[#005bac] outline-none transition-all text-sm font-semibold"
                  />
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">系统角色</label>
                  <select
                    value={formData.role}
                    onChange={e => setFormData({ ...formData, role: e.target.value })}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#005bac]/10 focus:border-[#005bac] outline-none transition-all text-sm font-semibold appearance-none cursor-pointer"
                  >
                    <option value="volunteer">志愿者</option>
                    <option value="admin">管理员</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">账号状态</label>
                  <select
                    value={formData.status}
                    onChange={e => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#005bac]/10 focus:border-[#005bac] outline-none transition-all text-sm font-semibold appearance-none cursor-pointer"
                  >
                    <option value="active">正常</option>
                    <option value="banned">禁用</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setShowAddModal(false)} className="px-6 py-2 rounded-xl text-sm font-bold text-gray-500 hover:bg-gray-100 transition-all">取消</button>
                <button type="submit" className="px-6 py-2 rounded-xl text-sm font-bold text-white bg-[#005bac] hover:bg-[#004a8d] shadow-lg shadow-blue-900/10 transition-all active:scale-95">保存设置</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 批量导入弹窗 */}
      {showBatchModal && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <h3 className="font-black text-gray-800 tracking-tight">批量导入用户数据</h3>
              <button 
                onClick={() => {
                  setShowBatchModal(false);
                  setImportFile(null);
                  setImportResult(null);
                }} 
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-50 text-[#005bac] rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <FileSpreadsheet className="h-8 w-8" />
                </div>
                <p className="text-sm font-bold text-gray-700 mb-1">请选择包含用户信息的 Excel 文件</p>
                <p className="text-[11px] text-gray-400">支持 .xlsx, .xls 格式，单次最多导入 500 条</p>
              </div>

              {/* 文件选择区域 */}
              <div className="space-y-3">
                <label className="block">
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileSelect}
                    className="hidden"
                    disabled={importing}
                  />
                  <div className={`w-full py-3 px-4 border-2 border-dashed rounded-xl text-center cursor-pointer transition-all ${
                    importFile 
                      ? 'border-[#005bac] bg-blue-50' 
                      : 'border-gray-200 hover:border-[#005bac] hover:bg-gray-50'
                  } ${importing ? 'opacity-50 cursor-not-allowed' : ''}`}>
                    {importFile ? (
                      <div className="flex items-center justify-center gap-2">
                        <FileSpreadsheet className="h-4 w-4 text-[#005bac]" />
                        <span className="text-sm font-semibold text-[#005bac]">{importFile.name}</span>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-500">点击选择文件或拖拽文件到此处</span>
                    )}
                  </div>
                </label>

                {/* 导入结果 */}
                {importResult && (
                  <div className={`p-3 rounded-lg text-xs ${
                    importResult.success 
                      ? 'bg-green-50 text-green-700 border border-green-200' 
                      : 'bg-red-50 text-red-700 border border-red-200'
                  }`}>
                    {importResult.success ? (
                      <div>
                        <p className="font-bold mb-1">导入完成</p>
                        <p>成功: {importResult.success_count} 条</p>
                        {importResult.error_count > 0 && (
                          <p>失败: {importResult.error_count} 条</p>
                        )}
                        {importResult.errors && importResult.errors.length > 0 && (
                          <div className="mt-2 max-h-32 overflow-y-auto">
                            {importResult.errors.map((error, idx) => (
                              <p key={idx} className="text-[10px]">{error}</p>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <p>{importResult.error || importResult.message || '导入失败'}</p>
                    )}
                  </div>
                )}

                {/* 操作按钮 */}
                <div className="flex flex-col gap-2">
                  <button
                    onClick={handleBatchImport}
                    disabled={!importFile || importing}
                    className={`w-full py-3 bg-[#005bac] text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-900/10 hover:bg-[#004a8d] transition-all ${
                      (!importFile || importing) ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    {importing ? '正在导入...' : '开始导入'}
                  </button>
                  <button
                    onClick={downloadTemplate}
                    disabled={importing}
                    className={`w-full py-3 bg-gray-50 text-gray-500 rounded-xl text-xs font-bold border border-gray-100 hover:bg-gray-100 transition-all flex items-center justify-center gap-2 ${
                      importing ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    <Download className="h-3.5 w-3.5" />
                    下载标准导入模板
                  </button>
                </div>

                {/* 模板说明 */}
                <div className="bg-gray-50 p-3 rounded-lg text-[10px] text-gray-500">
                  <p className="font-bold mb-1">模板格式说明：</p>
                  <p>必需列：username（用户名）、phone（手机号）、real_name（真实姓名）</p>
                  <p>可选列：role_type（角色：1=普通用户，2=志愿者，3=管理员）、status（状态：0=禁用，1=正常）</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};