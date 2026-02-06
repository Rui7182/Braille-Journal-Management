import React, { useState } from 'react';
import {
  Settings,
  UserCircle,
  Plus,
  Trash2,
  Palette,
  MoreHorizontal,
  X,
} from 'lucide-react';
export const SystemSettings = () => {
  const [avatars, setAvatars] = useState([
    { id: 1, color: 'bg-blue-500', icon: <UserCircle className="text-white h-12 w-12" /> },
    { id: 2, color: 'bg-green-500', icon: <UserCircle className="text-white h-12 w-12" /> },
    { id: 3, color: 'bg-purple-500', icon: <UserCircle className="text-white h-12 w-12" /> },
    { id: 4, color: 'bg-yellow-500', icon: <UserCircle className="text-white h-12 w-12" /> },
    { id: 5, color: 'bg-pink-500', icon: <UserCircle className="text-white h-12 w-12" /> },
    { id: 6, color: 'bg-indigo-500', icon: <UserCircle className="text-white h-12 w-12" /> },
    { id: 7, color: 'bg-teal-500', icon: <UserCircle className="text-white h-12 w-12" /> },
    { id: 8, color: 'bg-orange-500', icon: <UserCircle className="text-white h-12 w-12" /> },
  ]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newAvatar, setNewAvatar] = useState({ color: 'bg-blue-500' });

  const handleAddAvatar = () => {
    if (newAvatar.color) {
      setAvatars([...avatars, {
        id: Date.now(),
        color: newAvatar.color,
        icon: <UserCircle className="text-white h-12 w-12" />,
      }]);
      setShowAddModal(false);
      setNewAvatar({ color: 'bg-blue-500' });
    }
  };

  const handleDeleteAvatar = index => {
    if (window.confirm('确定要从系统中移除这个头像预设吗？')) {
      setAvatars(avatars.filter((_, i) => i !== index));
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      {/* 顶部统计栏 */}
      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center gap-6">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">头像总数</span>
          <span className="text-sm font-black text-gray-800">{avatars.length}</span>
        </div>
        <div className="w-px h-8 bg-gray-100"></div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">可用颜色</span>
          <span className="text-sm font-black text-purple-600">12 种</span>
        </div>
      </div>

      {/* 默认头像库设置 */}
      <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
        <div className="flex items-start justify-between mb-6 pb-4 border-b border-gray-50">
          <div>
            <h3 className="font-black text-gray-800 text-sm flex items-center gap-2 mb-1">
              <UserCircle className="h-4 w-4 text-[#005bac]" />
              默认头像库管理
            </h3>
            <p className="text-[11px] text-gray-400 font-medium">设置系统中用户可选择的默认头像预设。用户注册或编辑资料时可以从这些头像中选择。</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-[#005bac] text-white rounded-lg text-xs font-bold hover:bg-[#004a8d] shadow-sm transition-all flex items-center gap-2 active:scale-95"
          >
            <Plus className="h-3.5 w-3.5" />
            添加新头像
          </button>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
          {avatars.map((avatar, index) => (
            <div key={avatar.id || index} className="group relative flex justify-center">
              <div className={`w-16 h-16 ${avatar.color} rounded-full flex items-center justify-center shadow-md cursor-pointer hover:scale-110 hover:shadow-lg transition-all border-2 border-white hover:border-[#005bac]/30`}>
                {React.cloneElement(avatar.icon, { className: 'text-white h-7 w-7' })}
              </div>
              <div className="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                <button
                  onClick={() => handleDeleteAvatar(index)}
                  className="p-1 bg-red-500 text-white rounded-full hover:bg-red-600 shadow-md transition-all"
                  title="删除头像"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {avatars.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <UserCircle className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p className="text-xs font-bold uppercase tracking-tighter">暂无头像，请添加新头像</p>
          </div>
        )}
      </div>

      {/* 其他系统设置区域 */}
      <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
        <div className="flex items-start justify-between mb-4 pb-4 border-b border-gray-50">
          <div>
            <h3 className="font-black text-gray-800 text-sm flex items-center gap-2 mb-1">
              <Settings className="h-4 w-4 text-indigo-600" />
              系统高级配置
            </h3>
            <p className="text-[11px] text-gray-400 font-medium">系统其他配置项，包括通知设置、安全设置等。</p>
          </div>
        </div>
        <div className="text-center py-12 text-gray-400">
          <Settings className="h-16 w-16 mx-auto mb-4 text-gray-200" />
          <p className="text-xs font-bold uppercase tracking-tighter">更多设置项即将推出</p>
        </div>
      </div>

      {/* 添加新头像弹窗 */}
      {showAddModal && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <h3 className="font-black text-gray-800 tracking-tight">添加新头像预设</h3>
              <button onClick={() => { setShowAddModal(false); setNewAvatar({ color: 'bg-blue-500', icon: null }); }} className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-400">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-3 block">选择颜色</label>
                <div className="grid grid-cols-6 gap-2">
                  {['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-yellow-500', 'bg-pink-500', 'bg-gray-500', 'bg-red-500', 'bg-indigo-500', 'bg-teal-500', 'bg-orange-500', 'bg-cyan-500', 'bg-amber-500'].map(color => (
                    <button
                      key={color}
                      onClick={() => setNewAvatar({ ...newAvatar, color })}
                      className={`aspect-square ${color} rounded-xl transition-all ${
                        newAvatar.color === color ? 'ring-2 ring-[#005bac] ring-offset-2 scale-110' : 'hover:scale-110'
                      }`}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-3 block">预览效果</label>
                <div className={`w-20 h-20 ${newAvatar.color} rounded-full flex items-center justify-center shadow-md border-2 border-gray-200 mx-auto`}>
                  <UserCircle className="text-white h-12 w-12" />
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-3">
              <button onClick={() => { setShowAddModal(false); setNewAvatar({ color: 'bg-blue-500', icon: null }); }} className="px-6 py-2 rounded-xl text-sm font-bold text-gray-500 hover:bg-gray-100 transition-all">取消</button>
              <button onClick={handleAddAvatar} className="px-6 py-2 rounded-xl text-sm font-bold text-white bg-[#005bac] hover:bg-[#004a8d] shadow-lg shadow-blue-900/10 transition-all active:scale-95 flex items-center gap-2">
                保存预设
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};