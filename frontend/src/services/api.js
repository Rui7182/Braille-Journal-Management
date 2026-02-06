// API服务 - 用于与后端Django API通信。若部署在 api/v1 下，可设置 VITE_API_BASE=/api/v1
const API_BASE_URL = import.meta.env.VITE_API_BASE || '/api';

/**
 * 通用API请求函数
 */
async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  try {
    const response = await fetch(url, config);
    
    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `HTTP error! status: ${response.status}`;
      let errorDetails = null;
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.error || errorData.detail || errorData.message || errorMessage;
        errorDetails = errorData;
        // 将 "Method POST not allowed" 等接口错误转为友好提示
        if (typeof errorMessage === 'string' && /method\s+["']?post["']?\s+not\s+allowed/i.test(errorMessage)) {
          errorMessage = '登录请求失败，请检查网络或稍后重试。若为首次使用，可点击下方「创建初始管理员」。';
        }
        if (response.status === 404 && (endpoint.includes('init_admin') || endpoint.includes('login'))) {
          errorMessage = '登录接口未就绪，请确认后端已部署最新代码（需包含登录与初始管理员接口）。';
        }
        // 如果是验证错误，提取字段错误信息并转为中文
        const fieldNameZh = {
          title: '文献标题',
          pid: '所属期刊',
          periodical: '所属期刊',
          author: '作者',
          content: '正文内容',
          category: '栏目分类',
          created_by: '创建者',
        };
        const msgZh = (text) => {
          if (typeof text !== 'string') return text;
          const s = text.toLowerCase();
          if (s.includes('may not be blank') || s.includes('this field may not be blank')) return '不能为空';
          if (s.includes('required') || s.includes('this field is required')) return '必填';
          if (s.includes('invalid')) return '格式不正确';
          return text;
        };
        if (errorData.errors || (typeof errorData === 'object' && Object.keys(errorData).length > 0)) {
          const fieldErrors = [];
          for (const [field, messages] of Object.entries(errorData)) {
            const name = fieldNameZh[field] || field;
            const list = Array.isArray(messages) ? messages : (typeof messages === 'string' ? [messages] : []);
            for (const m of list) {
              fieldErrors.push(`${name}：${typeof m === 'string' ? msgZh(m) : String(m)}`);
            }
          }
          if (fieldErrors.length > 0) {
            errorMessage = fieldErrors.join('；');
          }
        }
      } catch (e) {
        errorMessage = errorText || errorMessage;
      }
      // 404 等返回 HTML 时不要用整段 HTML 当错误信息
      if (typeof errorMessage === 'string' && (errorMessage.trim().startsWith('<') || errorMessage.includes('<!DOCTYPE'))) {
        if (response.status === 404 && (endpoint.includes('init_admin') || endpoint.includes('login'))) {
          errorMessage = '登录接口未就绪，请确认后端已部署最新代码（需包含登录与初始管理员接口）。';
        } else {
          errorMessage = `请求失败 (${response.status})，请稍后重试。`;
        }
      }
      const error = new Error(errorMessage);
      error.details = errorDetails;
      error.status = response.status;
      throw error;
    }
    
    // DELETE 等操作可能返回 204 或空 body，直接 response.json() 会报 Unexpected end of JSON input
    const text = await response.text();
    if (!text || response.status === 204) return null;
    try {
      return JSON.parse(text);
    } catch (_) {
      return null;
    }
  } catch (error) {
    console.error(`API请求失败 [${endpoint}]:`, error);
    // 如果是网络错误，提供更友好的错误信息
    if (error.message === 'Failed to fetch' || error.name === 'TypeError') {
      const networkError = new Error('无法连接到服务器，请确保后端服务正在运行');
      networkError.isNetworkError = true;
      throw networkError;
    }
    throw error;
  }
}

/**
 * 文章API
 */
export const articleAPI = {
  // 获取所有文章
  getAll: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const endpoint = `/articles/${queryString ? `?${queryString}` : ''}`;
    const data = await apiRequest(endpoint);
    return data.results || data; // 处理分页响应
  },

  // 获取单个文章
  getById: async (id) => {
    return await apiRequest(`/articles/${id}/`);
  },

  // 创建文章
  create: async (articleData) => {
    return await apiRequest('/articles/', {
      method: 'POST',
      body: JSON.stringify(articleData),
    });
  },

  // 更新文章
  update: async (id, articleData) => {
    return await apiRequest(`/articles/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(articleData),
    });
  },

  // 部分更新文章
  partialUpdate: async (id, articleData) => {
    return await apiRequest(`/articles/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(articleData),
    });
  },

  // 删除文章
  delete: async (id) => {
    return await apiRequest(`/articles/${id}/`, {
      method: 'DELETE',
    });
  },

  // 获取文章统计
  getStats: async () => {
    return await apiRequest('/articles/stats/');
  },

  // 测试数据库连接
  testConnection: async () => {
    return await apiRequest('/articles/test_connection/');
  },

  // 管理员发布文章（仅当状态为「待发布」时可调用，会生成 AI 摘要并发布）
  publish: async (id) => {
    return await apiRequest(`/articles/${id}/publish/`, {
      method: 'POST',
    });
  },
};

/**
 * 期刊API
 */
export const periodicalAPI = {
  // 获取所有期刊
  getAll: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const endpoint = `/periodicals/${queryString ? `?${queryString}` : ''}`;
    const data = await apiRequest(endpoint);
    return data.results || data;
  },

  // 获取单个期刊
  getById: async (id) => {
    return await apiRequest(`/periodicals/${id}/`);
  },

  // 创建期刊
  create: async (periodicalData) => {
    return await apiRequest('/periodicals/', {
      method: 'POST',
      body: JSON.stringify(periodicalData),
    });
  },

  // 更新期刊
  update: async (id, periodicalData) => {
    return await apiRequest(`/periodicals/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(periodicalData),
    });
  },

  // 部分更新期刊
  partialUpdate: async (id, periodicalData) => {
    return await apiRequest(`/periodicals/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(periodicalData),
    });
  },

  // 删除期刊
  delete: async (id) => {
    return await apiRequest(`/periodicals/${id}/`, {
      method: 'DELETE',
    });
  },

  // 获取期刊统计
  getStats: async () => {
    return await apiRequest('/periodicals/stats/');
  },
};

/**
 * 用户API
 */
export const userAPI = {
  // 获取所有用户
  getAll: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const endpoint = `/users/${queryString ? `?${queryString}` : ''}`;
    const data = await apiRequest(endpoint);
    return data.results || data;
  },

  // 获取单个用户
  getById: async (id) => {
    return await apiRequest(`/users/${id}/`);
  },

  // 创建用户
  create: async (userData) => {
    return await apiRequest('/users/', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  },

  // 更新用户
  update: async (id, userData) => {
    return await apiRequest(`/users/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(userData),
    });
  },

  // 部分更新用户
  partialUpdate: async (id, userData) => {
    return await apiRequest(`/users/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(userData),
    });
  },

  // 删除用户
  delete: async (id) => {
    return await apiRequest(`/users/${id}/`, {
      method: 'DELETE',
    });
  },

  // 切换用户状态
  toggleStatus: async (id) => {
    return await apiRequest(`/users/${id}/toggle_status/`, {
      method: 'POST',
    });
  },

  // 批量导入用户
  batchImport: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    
    const url = `${API_BASE_URL}/users/batch_import/`;
    const response = await fetch(url, {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `HTTP error! status: ${response.status}`;
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.message || errorData.error || errorMessage;
      } catch (e) {
        errorMessage = errorText || errorMessage;
      }
      const error = new Error(errorMessage);
      error.status = response.status;
      throw error;
    }
    
    return await response.json();
  },

  // 获取用户统计
  getStats: async () => {
    return await apiRequest('/users/stats/');
  },

  // 登录：手机号 + 密码，返回用户信息
  login: async (phone, password) => {
    return await apiRequest('/users/login/', {
      method: 'POST',
      body: JSON.stringify({ phone: String(phone).trim(), password }),
    });
  },
};

/**
 * 认证/初始化 API（登录、创建初始管理员）
 */
export const authAPI = {
  login: userAPI.login,

  // 是否允许创建初始管理员（尚无管理员时）
  canInitAdmin: async () => {
    const data = await apiRequest('/auth/init_admin/');
    return data.can_init === true;
  },

  // 创建初始管理员（仅当系统中没有任何管理员时可用）
  initAdmin: async (phone, password, name) => {
    return await apiRequest('/auth/init_admin/', {
      method: 'POST',
      body: JSON.stringify({
        phone: String(phone).trim(),
        password,
        name: (name || '').trim() || '管理员',
      }),
    });
  },
};

/**
 * 分类API
 */
export const categoryAPI = {
  // 获取所有分类
  getAll: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const endpoint = `/categories/${queryString ? `?${queryString}` : ''}`;
    const data = await apiRequest(endpoint);
    return data.results || data;
  },

  // 获取单个分类
  getById: async (id) => {
    return await apiRequest(`/categories/${id}/`);
  },

  // 创建分类
  create: async (categoryData) => {
    return await apiRequest('/categories/', {
      method: 'POST',
      body: JSON.stringify(categoryData),
    });
  },

  // 更新分类
  update: async (id, categoryData) => {
    return await apiRequest(`/categories/${id}/`, {
      method: 'PUT',
      body: JSON.stringify(categoryData),
    });
  },

  // 删除分类
  delete: async (id) => {
    return await apiRequest(`/categories/${id}/`, {
      method: 'DELETE',
    });
  },
};

/**
 * 仪表板API
 */
export const dashboardAPI = {
  // 获取概览数据
  getOverview: async () => {
    return await apiRequest('/dashboard/overview/');
  },
};

/**
 * 搜索API
 */
export const searchAPI = {
  // 全局搜索
  globalSearch: async (query) => {
    return await apiRequest(`/search/global_search/?q=${encodeURIComponent(query)}`);
  },
};

/**
 * 通知API
 */
export const notificationAPI = {
  // 获取通知列表
  getList: async () => {
    return await apiRequest('/notifications/get_notifications/');
  },
};

/**
 * 全文阅读申请API（管理员端）
 */
export const accessApplicationsAPI = {
  // 获取申请列表
  getAll: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const endpoint = `/access-applications/${queryString ? `?${queryString}` : ''}`;
    const data = await apiRequest(endpoint);
    return data.results || data;
  },

  // 获取单个申请
  getById: async (id) => {
    return await apiRequest(`/access-applications/${id}/`);
  },

  // 同意申请
  approve: async (id) => {
    return await apiRequest(`/access-applications/${id}/approve/`, {
      method: 'POST',
    });
  },

  // 拒绝申请
  reject: async (id, reason = '') => {
    return await apiRequest(`/access-applications/${id}/reject/`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  },
};

/**
 * 导出默认API对象
 */
export default {
  article: articleAPI,
  periodical: periodicalAPI,
  user: userAPI,
  category: categoryAPI,
  dashboard: dashboardAPI,
  search: searchAPI,
  notification: notificationAPI,
  accessApplications: accessApplicationsAPI,
};
