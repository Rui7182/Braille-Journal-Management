import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Home, Users, Library, Settings, LogOut, ChevronDown, ChevronRight, Bell,
  Search, Menu, User, BookOpen, FileText, Calendar, X, ChevronUp, 
  FileText as FileTextIcon, BookOpen as BookOpenIcon, UserCircle
} from 'lucide-react';
import {
  DashboardOverview, UserManagement, PeriodicalList, ArticleList,
  PeriodicalDirectory, SystemSettings, AccessApplicationList
} from '../features/admin';
import { articleAPI, periodicalAPI, userAPI, dashboardAPI, searchAPI, notificationAPI } from '../services/api';

const SITE_TITLE = '盲人月刊管理后台';
const PATH_TO_TAB = {
  '/': 'dashboard',
  '/dashboard': 'dashboard',
  '/users': 'users',
  '/periodicals': 'periodicalList',
  '/articles': 'articleList',
  '/catalog': 'periodicals',
  '/applications': 'accessApplications',
  '/settings': 'settings',
};
const TAB_TO_PATH = {
  dashboard: '/',
  users: '/users',
  periodicalList: '/periodicals',
  articleList: '/articles',
  periodicals: '/catalog',
  accessApplications: '/applications',
  settings: '/settings',
};
const TAB_TITLES = {
  dashboard: '工作台',
  users: '人员管理',
  periodicalList: '期刊列表',
  articleList: '文章列表',
  periodicals: '目录管理',
  accessApplications: '全文阅读申请',
  settings: '系统设置',
};

const AdminPage = ({ user, onLogout }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const activeTab = PATH_TO_TAB[location.pathname] ?? 'dashboard';

  const setActiveTab = (tab) => {
    const path = TAB_TO_PATH[tab];
    if (path) navigate(path);
  };

  const [users, setUsers] = useState([]);
  const [periodicals, setPeriodicals] = useState([]);
  const [articles, setArticles] = useState([]);
  const [articlesLoading, setArticlesLoading] = useState(true);
  const [articlesError, setArticlesError] = useState(null);
  const [periodicalsLoading, setPeriodicalsLoading] = useState(false);
  const [usersLoading, setUsersLoading] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState(['content']);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [currentDate, setCurrentDate] = useState('');

  useEffect(() => {
    const pageName = TAB_TITLES[activeTab] || '工作台';
    document.title = `${pageName} - ${SITE_TITLE}`;
  }, [activeTab]);

  useEffect(() => {
    if (['periodicalList', 'articleList', 'periodicals'].includes(activeTab)) {
      setExpandedMenus((prev) => (prev.includes('content') ? prev : [...prev, 'content']));
    }
  }, [activeTab]);

  // 从API获取文章数据
  useEffect(() => {
    const fetchArticles = async () => {
      try {
        setArticlesLoading(true);
        setArticlesError(null);
        const data = await articleAPI.getAll();
        // 处理API返回的数据格式（可能是数组或分页对象）
        const articlesList = Array.isArray(data) ? data : (data.results || []);
        setArticles(articlesList);
        console.log('成功获取文章数据:', articlesList.length, '篇');
      } catch (error) {
        console.error('获取文章数据失败:', error);
        setArticlesError(error.message);
        // 如果API失败，使用空数组而不是mock数据
        setArticles([]);
      } finally {
        setArticlesLoading(false);
      }
    };

    fetchArticles();
  }, []);

  // 从API获取期刊数据
  useEffect(() => {
    const fetchPeriodicals = async () => {
      try {
        setPeriodicalsLoading(true);
        const data = await periodicalAPI.getAll();
        const periodicalsList = Array.isArray(data) ? data : (data.results || []);
        setPeriodicals(periodicalsList);
        console.log('成功获取期刊数据:', periodicalsList.length, '个');
      } catch (error) {
        console.error('获取期刊数据失败:', error);
        // 如果API失败，使用空数组
        setPeriodicals([]);
      } finally {
        setPeriodicalsLoading(false);
      }
    };

    fetchPeriodicals();
  }, []);

  // 从API获取用户数据
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setUsersLoading(true);
        const data = await userAPI.getAll();
        const usersList = Array.isArray(data) ? data : (data.results || []);
        setUsers(usersList);
        console.log('成功获取用户数据:', usersList.length, '个');
      } catch (error) {
        console.error('获取用户数据失败:', error);
        // 如果API失败，使用空数组
        setUsers([]);
      } finally {
        setUsersLoading(false);
      }
    };

    fetchUsers();
  }, []);

  // 获取通知列表
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const data = await notificationAPI.getList();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unread_count || 0);
      } catch (error) {
        console.error('获取通知失败:', error);
        setNotifications([]);
        setUnreadCount(0);
      }
    };

    fetchNotifications();
    // 每30秒刷新一次通知
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  // 设置当前日期
  useEffect(() => {
    const updateDate = () => {
      const now = new Date();
      const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
      const year = now.getFullYear();
      const month = now.getMonth() + 1;
      const day = now.getDate();
      const weekday = weekdays[now.getDay()];
      setCurrentDate(`${year}年${month}月${day}日 ${weekday}`);
    };
    updateDate();
    // 每天更新一次日期
    const interval = setInterval(updateDate, 86400000);
    return () => clearInterval(interval);
  }, []);

  // 处理搜索
  const handleSearch = async (query) => {
    if (!query.trim()) {
      setSearchResults(null);
      setShowSearchResults(false);
      return;
    }

    try {
      const results = await searchAPI.globalSearch(query);
      setSearchResults(results);
      setShowSearchResults(true);
    } catch (error) {
      console.error('搜索失败:', error);
      setSearchResults(null);
      setShowSearchResults(false);
    }
  };

  // 搜索输入防抖
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery) {
        handleSearch(searchQuery);
      } else {
        setSearchResults(null);
        setShowSearchResults(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const currentUser = user || { username: "管理员", role: "admin", avatar: "A" };

  const toggleMenu = (menuId) => {
    if (expandedMenus.includes(menuId)) setExpandedMenus(expandedMenus.filter(id => id !== menuId));
    else setExpandedMenus([...expandedMenus, menuId]);
  };

  const menuItems = [
    { id: 'dashboard', label: '工作台', icon: Home },
    { id: 'users', label: '人员管理', icon: Users },
    {
      id: 'content',
      label: '内容管理',
      icon: Library,
      children: [
        { id: 'periodicalList', label: '期刊列表' },
        { id: 'articleList', label: '文章列表' },
        { id: 'periodicals', label: '目录管理' },
      ]
    },
    { id: 'accessApplications', label: '全文阅读申请', icon: FileText },
    { id: 'settings', label: '系统设置', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-[#f0f2f5] flex font-sans text-gray-700">
      {/* 侧边栏 */}
      <aside className={`${isSidebarOpen ? 'w-64' : 'w-20'} bg-white border-r border-gray-200 flex flex-col shrink-0 transition-all duration-300 shadow-sm z-20`}>
        <div className="h-16 flex items-center px-6 border-b border-gray-100 gap-3 overflow-hidden whitespace-nowrap">
          <div className="bg-[#005bac] p-1.5 rounded flex-shrink-0">
            <BookOpen className="h-5 w-5 text-white" />
          </div>
          {isSidebarOpen && <span className="font-bold text-lg text-gray-800 tracking-tight">管理系统</span>}
        </div>

        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {menuItems.map(item => (
            <div key={item.id}>
              {item.children ? (
                <>
                  <button
                    onClick={() => toggleMenu(item.id)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-all duration-200 hover:bg-gray-50 group ${expandedMenus.includes(item.id) ? 'text-[#005bac]' : 'text-gray-500'}`}
                  >
                    <div className="flex items-center gap-3">
                      <item.icon className={`h-5 w-5 ${expandedMenus.includes(item.id) ? 'text-[#005bac]' : 'text-gray-400 group-hover:text-gray-600'}`} />
                      {isSidebarOpen && <span className="font-medium">{item.label}</span>}
                    </div>
                    {isSidebarOpen && (expandedMenus.includes(item.id) ? <ChevronDown className="h-4 w-4 opacity-50"/> : <ChevronRight className="h-4 w-4 opacity-50"/>)}
                  </button>
                  {isSidebarOpen && expandedMenus.includes(item.id) && (
                    <div className="mt-1 ml-4 pl-4 border-l border-gray-100 space-y-1">
                      {item.children.map(child => (
                        <button
                          key={child.id}
                          onClick={() => setActiveTab(child.id)}
                          className={`w-full text-left py-2 px-4 rounded-md text-sm transition-all ${activeTab === child.id ? 'bg-blue-50 text-[#005bac] font-semibold' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'}`}
                        >
                          {child.label}
                        </button>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <button
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group ${activeTab === item.id ? 'bg-[#005bac] text-white shadow-md shadow-blue-900/10' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'}`}
                >
                  <item.icon className={`h-5 w-5 ${activeTab === item.id ? 'text-white' : 'text-gray-400 group-hover:text-gray-600'}`} />
                  {isSidebarOpen && <span className="font-medium">{item.label}</span>}
                </button>
              )}
            </div>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-100">
          <div className={`flex items-center ${isSidebarOpen ? 'gap-3 px-3 py-2' : 'justify-center py-2'} bg-gray-50 rounded-xl`}>
            <div className="w-8 h-8 rounded-full bg-[#005bac] flex items-center justify-center text-xs font-bold text-white shadow-sm">
              {currentUser.username[0]}
            </div>
            {isSidebarOpen && (
              <div className="flex-1 overflow-hidden">
                <div className="text-sm font-bold text-gray-800 truncate">{currentUser.username}</div>
                <div className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Administrator</div>
              </div>
            )}
            {isSidebarOpen && (
              <button onClick={onLogout} className="text-gray-400 hover:text-red-500 transition-colors" title="退出">
                <LogOut className="h-4 w-4"/>
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* 主内容区 */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* 顶部通栏 */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-8 shrink-0 z-10">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-500">
              <Menu className="h-5 w-5" />
            </button>
            <div className="h-8 w-px bg-gray-200 mx-2 hidden md:block"></div>
            <div className="hidden md:flex relative items-center bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100 w-64">
              <Search className="h-4 w-4 text-gray-400 mr-2" />
              <input 
                type="text" 
                placeholder="搜索期刊、文章或用户..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => searchQuery && setShowSearchResults(true)}
                className="bg-transparent text-sm outline-none w-full text-gray-600 placeholder:text-gray-400" 
              />
              {searchQuery && (
                <button 
                  onClick={() => {
                    setSearchQuery('');
                    setSearchResults(null);
                    setShowSearchResults(false);
                  }}
                  className="ml-2 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
              
              {/* 搜索结果下拉框 */}
              {showSearchResults && searchResults && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg border border-gray-200 shadow-lg z-50 max-h-96 overflow-y-auto">
                  {searchResults.total === 0 ? (
                    <div className="p-4 text-center text-sm text-gray-400">
                      未找到相关结果
                    </div>
                  ) : (
                    <>
                      {searchResults.articles && searchResults.articles.length > 0 && (
                        <div className="p-2">
                          <div className="px-3 py-1 text-xs font-bold text-gray-400 uppercase">文章 ({searchResults.articles.length})</div>
                          {searchResults.articles.map(article => (
                            <button
                              key={article.id}
                              onClick={() => {
                                setActiveTab('articleList');
                                setSearchQuery('');
                                setShowSearchResults(false);
                              }}
                              className="w-full px-3 py-2 text-left hover:bg-gray-50 rounded flex items-center gap-2 group"
                            >
                              <FileTextIcon className="h-4 w-4 text-gray-400 group-hover:text-[#005bac]" />
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-semibold text-gray-800 group-hover:text-[#005bac] truncate">{article.title}</div>
                                <div className="text-xs text-gray-400 truncate">{article.author || '未知作者'}</div>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                      {searchResults.periodicals && searchResults.periodicals.length > 0 && (
                        <div className="p-2 border-t border-gray-100">
                          <div className="px-3 py-1 text-xs font-bold text-gray-400 uppercase">期刊 ({searchResults.periodicals.length})</div>
                          {searchResults.periodicals.map(periodical => (
                            <button
                              key={periodical.id}
                              onClick={() => {
                                setActiveTab('periodicalList');
                                setSearchQuery('');
                                setShowSearchResults(false);
                              }}
                              className="w-full px-3 py-2 text-left hover:bg-gray-50 rounded flex items-center gap-2 group"
                            >
                              <BookOpenIcon className="h-4 w-4 text-gray-400 group-hover:text-[#005bac]" />
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-semibold text-gray-800 group-hover:text-[#005bac] truncate">{periodical.title}</div>
                                <div className="text-xs text-gray-400">{periodical.year}年</div>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                      {searchResults.users && searchResults.users.length > 0 && (
                        <div className="p-2 border-t border-gray-100">
                          <div className="px-3 py-1 text-xs font-bold text-gray-400 uppercase">用户 ({searchResults.users.length})</div>
                          {searchResults.users.map(user => (
                            <button
                              key={user.id}
                              onClick={() => {
                                setActiveTab('users');
                                setSearchQuery('');
                                setShowSearchResults(false);
                              }}
                              className="w-full px-3 py-2 text-left hover:bg-gray-50 rounded flex items-center gap-2 group"
                            >
                              <UserCircle className="h-4 w-4 text-gray-400 group-hover:text-[#005bac]" />
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-semibold text-gray-800 group-hover:text-[#005bac] truncate">{user.name || user.username}</div>
                                <div className="text-xs text-gray-400 truncate">{user.phone || user.username}</div>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="hidden lg:flex items-center gap-2 text-xs text-gray-400 font-medium">
              <Calendar className="h-3.5 w-3.5" />
              <span>{currentDate || '加载中...'}</span>
            </div>
            <div className="relative">
              <button 
                onClick={() => {
                  setShowNotifications(!showNotifications);
                  setShowUserMenu(false);
                }}
                className="relative p-2 text-gray-400 hover:text-[#005bac] hover:bg-blue-50 rounded-full transition-all"
              >
                <Bell className="h-5 w-5"/>
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
                )}
              </button>
              
              {/* 通知下拉框 */}
              {showNotifications && (
                <div 
                  className="absolute right-0 top-full mt-2 w-80 bg-white rounded-lg border border-gray-200 shadow-lg z-50 max-h-96 overflow-y-auto"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                    <h3 className="text-sm font-bold text-gray-800">通知中心</h3>
                    <button 
                      onClick={() => setShowNotifications(false)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {notifications.length === 0 ? (
                      <div className="p-8 text-center text-sm text-gray-400">
                        <Bell className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                        <p>暂无通知</p>
                      </div>
                    ) : (
                      notifications.map(notification => (
                        <button
                          key={notification.id}
                          onClick={() => {
                            if (notification.link) {
                              const [pathPart, searchPart] = notification.link.split('?');
                              const tab = pathPart.replace(/^\//, '');
                              const path = TAB_TO_PATH[tab] || '/';
                              navigate(searchPart ? `${path}?${searchPart}` : path);
                            }
                            setShowNotifications(false);
                          }}
                          className="w-full p-4 text-left hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex items-start gap-3">
                            <div className={`p-2 rounded-lg ${
                              notification.priority === 'high' ? 'bg-red-50 text-red-600' :
                              notification.priority === 'medium' ? 'bg-yellow-50 text-yellow-600' :
                              notification.priority === 'low' ? 'bg-blue-50 text-blue-600' :
                              'bg-gray-50 text-gray-600'
                            }`}>
                              {notification.type === 'review' && <FileTextIcon className="h-4 w-4" />}
                              {notification.type === 'publish' && <BookOpenIcon className="h-4 w-4" />}
                              {notification.type === 'claim' && <UserCircle className="h-4 w-4" />}
                              {notification.type === 'access_application' && <FileTextIcon className="h-4 w-4" />}
                              {notification.type === 'empty' && <Bell className="h-4 w-4" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-semibold text-gray-800 mb-1">{notification.title}</div>
                              <div className="text-xs text-gray-500">{notification.message}</div>
                              {notification.count > 0 && (
                                <div className="mt-2 inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-[#005bac] text-white">
                                  {notification.count} 项
                                </div>
                              )}
                            </div>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
            <div className="h-8 w-px bg-gray-200"></div>
            <div className="relative">
              <button
                onClick={() => {
                  setShowUserMenu(!showUserMenu);
                  setShowNotifications(false);
                }}
                className="flex items-center gap-3 cursor-pointer group"
              >
                <div className="text-right hidden sm:block">
                  <div className="text-sm font-bold text-gray-800 group-hover:text-[#005bac] transition-colors">{currentUser.username}</div>
                  <div className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">System Admin</div>
                </div>
                <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center border border-gray-200 group-hover:border-[#005bac]/30 transition-all overflow-hidden">
                  <User className="h-5 w-5 text-gray-400 group-hover:text-[#005bac]" />
                </div>
              </button>
              
              {/* 用户下拉菜单 */}
              {showUserMenu && (
                <div 
                  className="absolute right-0 top-full mt-2 w-56 bg-white rounded-lg border border-gray-200 shadow-lg z-50"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="p-4 border-b border-gray-100">
                    <div className="text-sm font-bold text-gray-800">{currentUser.username}</div>
                    <div className="text-xs text-gray-400 mt-1">{currentUser.phone || '系统管理员'}</div>
                  </div>
                  <div className="p-2">
                    <button
                      onClick={() => {
                        setActiveTab('settings');
                        setShowUserMenu(false);
                      }}
                      className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 rounded-lg flex items-center gap-2 transition-colors"
                    >
                      <Settings className="h-4 w-4" />
                      系统设置
                    </button>
                    <button
                      onClick={() => {
                        setActiveTab('users');
                        setShowUserMenu(false);
                      }}
                      className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 rounded-lg flex items-center gap-2 transition-colors"
                    >
                      <Users className="h-4 w-4" />
                      人员管理
                    </button>
                  </div>
                  <div className="p-2 border-t border-gray-100">
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        if (onLogout) onLogout();
                      }}
                      className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 rounded-lg flex items-center gap-2 transition-colors"
                    >
                      <LogOut className="h-4 w-4" />
                      退出登录
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* 页面内容 */}
        <main className="flex-1 overflow-y-auto p-6 scroll-smooth" onClick={() => {
          setShowSearchResults(false);
          setShowNotifications(false);
          setShowUserMenu(false);
        }}>
          <div className="max-w-7xl mx-auto">
            {/* 显示加载状态或错误信息 */}
            {articlesLoading && activeTab === 'articleList' && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <p className="text-blue-800">正在从数据库加载文章数据...</p>
              </div>
            )}
            {articlesError && activeTab === 'articleList' && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                <p className="text-red-800">加载文章数据失败: {articlesError}</p>
                <p className="text-red-600 text-sm mt-1">请确保后端服务正在运行 (http://localhost:8000)</p>
              </div>
            )}
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              {activeTab === 'dashboard' && <DashboardOverview users={users} articles={articles} periodicals={periodicals} onNavigate={setActiveTab} />}
              {activeTab === 'users' && <UserManagement users={users} setUsers={setUsers} />}
              {activeTab === 'periodicalList' && <PeriodicalList periodicals={periodicals} setPeriodicals={setPeriodicals} />}
              {activeTab === 'articleList' && <ArticleList articles={articles} setArticles={setArticles} periodicals={periodicals} />}
              {activeTab === 'periodicals' && <PeriodicalDirectory periodicals={periodicals} setPeriodicals={setPeriodicals} articles={articles} setArticles={setArticles} />}
              {activeTab === 'accessApplications' && <AccessApplicationList />}
              {activeTab === 'settings' && <SystemSettings />}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminPage;