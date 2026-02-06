import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  LogIn,
  Eye,
  EyeOff,
  Shield,
  Lock,
  Phone,
  AlertCircle,
  Globe,
  BookOpen,
} from 'lucide-react';

// 本地校验登录：不请求后端，账号密码正确即放行
const ADMIN_PHONE = '13800138000';
const ADMIN_PASSWORD = 'Admin123456';

const LoginPage = ({ onLogin }) => {
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  useEffect(() => {
    document.title = `登录 - 盲人月刊管理后台`;
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const trimPhone = phone.trim();
    if (!trimPhone) {
      setError('请输入手机号');
      return;
    }
    if (!password) {
      setError('请输入密码');
      return;
    }
    setLoading(true);
    // 模拟一点延迟
    await new Promise((r) => setTimeout(r, 300));
    if (trimPhone === ADMIN_PHONE && password === ADMIN_PASSWORD) {
      if (onLogin) {
        onLogin({
          id: 1,
          username: '管理员',
          role: 'admin',
          avatar: '管',
          phone: ADMIN_PHONE,
        });
      }
      navigate('/', { replace: true });
    } else {
      setError('手机号或密码错误');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#f4f7f9] flex flex-col font-sans">
      <div className="h-1.5 bg-[#005bac]"></div>
      <header className="bg-white border-b border-gray-200 py-4 px-8 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-[#005bac] p-2 rounded">
            <BookOpen className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-800 tracking-tight">盲文期刊管理系统</h1>
            <p className="text-[10px] text-gray-400 uppercase tracking-widest leading-none mt-0.5">
              Braille Journal Management System
            </p>
          </div>
        </div>
        <div className="hidden md:flex items-center gap-6 text-sm text-gray-600">
          <Link to="/" className="hover:text-[#005bac] transition-colors">系统首页</Link>
          <a href="#" className="hover:text-[#005bac] transition-colors">使用指南</a>
          <a href="#" className="hover:text-[#005bac] transition-colors">联系技术支持</a>
          <div className="flex items-center gap-1 text-gray-400 border-l pl-6 ml-2">
            <Globe className="h-4 w-4" />
            <span>中文 (简体)</span>
          </div>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full opacity-[0.03] pointer-events-none">
          <div className="absolute top-[-10%] right-[-5%] w-[40%] h-[60%] rounded-full bg-[#005bac] blur-[120px]"></div>
          <div className="absolute bottom-[-10%] left-[-5%] w-[40%] h-[60%] rounded-full bg-[#005bac] blur-[120px]"></div>
        </div>

        <div className="w-full max-w-[1000px] flex bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden relative z-10">
          <div className="hidden lg:flex lg:w-1/2 bg-[#005bac] p-12 flex-col justify-between text-white relative">
            <div className="relative z-10">
              <h2 className="text-3xl font-bold mb-6 leading-tight">
                数字化盲文期刊<br />全流程管理平台
              </h2>
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="bg-white/10 p-2 rounded-lg">
                    <Shield className="h-5 w-5 text-blue-200" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-blue-50">安全可靠</h4>
                    <p className="text-sm text-blue-100/70">多级权限管理，保障期刊数据安全与版权。</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="bg-white/10 p-2 rounded-lg">
                    <LogIn className="h-5 w-5 text-blue-200" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-blue-50">高效协同</h4>
                    <p className="text-sm text-blue-100/70">志愿者与管理员实时协作，加速盲文转换流程。</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="relative z-10">
              <div className="pt-8 border-t border-white/10 text-xs text-blue-100/50">
                <p>当前版本: v2.4.0 (Build 20250318)</p>
                <p className="mt-1">© 2025 中国残疾人联合会 · 盲文出版社</p>
              </div>
            </div>
            <div className="absolute bottom-0 right-0 opacity-10">
              <BookOpen className="w-64 h-64 -mb-16 -mr-16" />
            </div>
          </div>

          <div className="w-full lg:w-1/2 p-10 md:p-16 flex flex-col justify-center">
            <div className="mb-10">
              <h3 className="text-2xl font-bold text-gray-800 mb-2">管理员登录</h3>
              <p className="text-gray-500 text-sm">使用手机号与密码登录后台管理系统</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded text-sm text-red-600">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">手机号</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Phone className="h-4 w-4 text-gray-400 group-focus-within:text-[#005bac] transition-colors" />
                  </div>
                  <input
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel"
                    value={phone}
                    onChange={(e) => { setPhone(e.target.value); setError(''); }}
                    placeholder="请输入手机号"
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#005bac]/20 focus:border-[#005bac] focus:bg-white outline-none transition-all text-gray-700 placeholder:text-gray-400"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">登录密码</label>
                  <button type="button" onClick={() => setShowForgotPassword(true)} className="text-xs text-[#005bac] hover:underline font-medium">忘记密码?</button>
                </div>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Lock className="h-4 w-4 text-gray-400 group-focus-within:text-[#005bac] transition-colors" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setError(''); }}
                    placeholder="请输入密码"
                    className="w-full pl-10 pr-12 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#005bac]/20 focus:border-[#005bac] focus:bg-white outline-none transition-all text-gray-700 placeholder:text-gray-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2 py-2">
                <input type="checkbox" id="remember" className="w-4 h-4 rounded border-gray-300 text-[#005bac] focus:ring-[#005bac]" />
                <label htmlFor="remember" className="text-sm text-gray-600 cursor-pointer select-none">在 30 天内保持登录状态</label>
              </div>

              <button
                type="submit"
                disabled={loading}
                className={`w-full py-3.5 rounded-lg font-bold text-white shadow-lg shadow-blue-900/10 transition-all active:scale-[0.98] ${
                  loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-[#005bac] hover:bg-[#004a8d] hover:shadow-blue-900/20'
                } flex items-center justify-center gap-2`}
              >
                {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : (<><span>立即登录</span><LogIn className="h-4 w-4" /></>)}
              </button>
            </form>
          </div>
        </div>
      </main>

      <footer className="py-6 text-center text-gray-400 text-xs border-t border-gray-200 bg-white">
        <p>推荐使用 Chrome, Edge 或 Firefox 浏览器以获得最佳体验</p>
        <p className="mt-1">京ICP备12345678号-1 · 京公网安备11010102001234号</p>
      </footer>

      {showForgotPassword && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setShowForgotPassword(false)}>
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6 text-left" onClick={(e) => e.stopPropagation()}>
            <h4 className="text-lg font-bold text-gray-800 mb-3">忘记密码</h4>
            <p className="text-sm text-gray-600 leading-relaxed mb-3">
              请联系系统管理员重置密码。管理员可在「人员管理」中为您的账号重新设置密码。
            </p>
            <p className="text-sm text-gray-600 leading-relaxed border-t border-gray-100 pt-3">
              <span className="font-medium text-gray-700">若系统管理员账号丢失</span>（如唯一管理员忘记密码），需由技术人员在服务器上执行密码重置命令，详见《盲人期刊管理端-使用与交接说明》中的「系统管理员账号丢失时」。
            </p>
            <div className="mt-5 flex justify-end">
              <button type="button" onClick={() => setShowForgotPassword(false)} className="px-4 py-2 rounded-lg font-medium text-white bg-[#005bac] hover:bg-[#004a8d] transition-colors">
                知道了
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoginPage;
