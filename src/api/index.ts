import { useAuth } from '../context/AuthContext';
import axios from 'axios';

// 这个文件将提供一个函数来获取已经过认证的 Axios 实例
// 注意：useAuth 必须在 React 组件或自定义 Hook 中调用。
// 因此，我们不能直接在这里导出 getAuthenticatedAxios。
// 相反，每个需要认证的 API 模块都需要在其内部调用 useAuth().getAuthenticatedAxios()。

// 导出未经认证的公共 Axios 实例，用于不需要认证的请求（如登录、注册）
// 基础 URL 从环境变量中获取
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

export const publicApi = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 对于需要认证的API模块，它们会像下面这样使用 useAuth
// 示例 (不要直接在这里写，这是为了说明用法):
/*
import { useAuth } from '../context/AuthContext';

export const useIamApi = () => {
  const { getAuthenticatedAxios } = useAuth();
  const iamApi = getAuthenticatedAxios();
  return {
    login: (data: LoginRequest) => iamApi.post('/api/iam/auth/login', data),
    getUsers: () => iamApi.get('/api/iam/users'),
    // ... 其他 IAM 相关的 API
  };
};
*/
