import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import axios, { AxiosError } from 'axios';
import type { AxiosInstance } from 'axios';
import { jwtDecode } from 'jwt-decode';
import { message } from 'antd';

// 定义 UserInfo 结构
interface UserInfo {
  username: string;
  tenantId: string;
  roles: string[];
  permissions: string[]; // 权限列表
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: UserInfo | null;
  login: (identifier: string, password: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
  accessToken: string | null;
  getAuthenticatedAxios: () => AxiosInstance; // 移除 baseURL 参数，使用统一的 API_BASE_URL
  hasPermission: (permission: string) => boolean;
  hasAnyRole: (roles: string[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

// 公共 Axios 实例，用于不需要认证的请求（如登录、刷新token）
export const publicApi = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [user, setUser] = useState<UserInfo | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true); // 初始为 true，表示正在检查认证状态

  const parseTokenAndSetUser = useCallback((token: string) => {
    console.log("AuthContext: parseTokenAndSetUser called with token:", token ? "Token present" : "No token");
    try {
      const decodedToken: any = jwtDecode(token);
      console.log("AuthContext: 🔍 Debug Token解析结果:", decodedToken);

      const roles = typeof decodedToken.roles === 'string'
          ? decodedToken.roles.split(',')
          : (decodedToken.roles || []);

      const rawAuthorities = decodedToken.authorities || decodedToken.scope || [];
      const permissions = Array.isArray(rawAuthorities)
            ? rawAuthorities
            : (typeof rawAuthorities === 'string' ? rawAuthorities.split(' ') : []);

      setUser({
          username: decodedToken.sub,
          tenantId: decodedToken.tenantId,
          roles,
          permissions
      });
      setIsAuthenticated(true);
      setAccessToken(token);
      console.log("AuthContext: 用户信息已设置， isAuthenticated = true");
    } catch (e) {
      console.error("AuthContext: Token parsing failed", e);
      // 解析失败不直接 logout，避免死循环，而是由拦截器处理或在初始化时处理
    }
  }, []);

  const logout = useCallback(() => {
    console.log("AuthContext: Logging out user.");
    const currentToken = localStorage.getItem('accessToken');

    // 尝试通知后端登出（可选）
    if (currentToken) {
      // 使用 publicApi 避免在登出时再次触发认证拦截器
      publicApi.post(`${API_BASE_URL}/api/iam/auth/logout`, {}, {
        headers: { Authorization: `Bearer ${currentToken}` }
      }).catch(e => console.warn("AuthContext: Backend logout failed (might be expired token):", e));
    }

    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    setAccessToken(null);
    setIsAuthenticated(false);
    setUser(null);
    console.log("AuthContext: Logout completed.");
  }, []);

  const refreshAccessToken = useCallback(async (): Promise<string | null> => {
    console.log("AuthContext: refreshAccessToken called.");
    const storedRefreshToken = localStorage.getItem('refreshToken');
    if (!storedRefreshToken) {
      console.warn("AuthContext: No refresh token found, logging out.");
      logout();
      return null;
    }

    try {
      // 使用 publicApi 避免拦截器死循环
      const response = await publicApi.post(`${API_BASE_URL}/api/iam/auth/refresh-token`, {
        refreshToken: storedRefreshToken,
      });

      const { accessToken: newAccessToken, refreshToken: newRefreshToken } = response.data;

      localStorage.setItem('accessToken', newAccessToken);
      localStorage.setItem('refreshToken', newRefreshToken);

      parseTokenAndSetUser(newAccessToken);
      console.log("AuthContext: Access token refreshed successfully.");
      return newAccessToken;
    } catch (error: any) {
      console.error("AuthContext: Failed to refresh access token:", error);
      message.error("会话过期，请重新登录。"); // 提示用户
      logout();
      return null;
    }
  }, [logout, parseTokenAndSetUser]);

  // 初始化检查
  useEffect(() => {
    const checkAuthStatus = async () => {
      console.log("AuthContext: useEffect - checking auth status.");
      setLoading(true);
      const storedAccessToken = localStorage.getItem('accessToken');
      const storedRefreshToken = localStorage.getItem('refreshToken');

      if (storedAccessToken) {
        console.log("AuthContext: Found stored access token.");
        try {
          const decodedToken: any = jwtDecode(storedAccessToken);
          // 检查 Token 是否过期 (exp 是秒，Date.now() 是毫秒)
          if (decodedToken.exp * 1000 > Date.now()) {
            console.log("AuthContext: Stored access token is valid.");
            parseTokenAndSetUser(storedAccessToken);
          } else {
            console.log("AuthContext: Stored access token expired, attempting to refresh.");
            await refreshAccessToken(); // 尝试刷新
          }
        } catch (error) {
          console.error("AuthContext: Invalid access token on init (parsing failed), logging out:", error);
          logout();
        }
      } else if (storedRefreshToken) { // 如果没有 accessToken 但有 refreshToken，也尝试刷新
          console.log("AuthContext: No access token, but found refresh token, attempting to refresh.");
          await refreshAccessToken();
      } else {
        console.log("AuthContext: No tokens found, user is not authenticated.");
        setIsAuthenticated(false);
      }
      setLoading(false);
      console.log("AuthContext: useEffect - auth status check finished.");
    };

    checkAuthStatus();
  }, [refreshAccessToken, logout, parseTokenAndSetUser]);


  const login = async (identifier: string, password: string) => {
    setLoading(true);
    try {
      const response = await publicApi.post(`${API_BASE_URL}/api/iam/auth/login`, {
        identifier,
        password,
      });
      const { accessToken, refreshToken } = response.data;
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      parseTokenAndSetUser(accessToken);
      console.log("AuthContext: Login successful, tokens stored.");
    } catch (error) {
      setIsAuthenticated(false);
      setUser(null);
      console.error("AuthContext: Login failed:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const hasPermission = useCallback((permission: string) => {
      if (!user) return false;
      // 管理员角色拥有所有权限
      if (user.roles.includes('ROLE_ADMIN')) return true;
      return user.permissions.includes(permission);
  }, [user]);

  const hasAnyRole = useCallback((roles: string[]) => {
      if (!user) return false;
      return roles.some(role => user.roles.includes(role));
  }, [user]);

  // 核心逻辑：获取带拦截器的 Axios 实例
  const getAuthenticatedAxios = useCallback(() => { // 移除 baseURL 参数
    const instance = axios.create({
      baseURL: API_BASE_URL, // 使用统一的 API_BASE_URL
      headers: { 'Content-Type': 'application/json' },
    });

    // 请求拦截器：注入 Token
    instance.interceptors.request.use(
      async (config) => {
        let token = accessToken || localStorage.getItem('accessToken');

        if (token) {
           try {
               const decoded: any = jwtDecode(token);
               if (decoded.exp * 1000 < Date.now()) {
                   console.log("AuthContext: Token expired in request interceptor, attempting to refresh...");
                   token = await refreshAccessToken(); // 尝试刷新令牌
               }
           } catch (e) {
               console.error("AuthContext: Error decoding token in interceptor:", e);
               logout(); // 如果 token 解析失败，直接登出
               return Promise.reject(new Error("Invalid token."));
           }
        }

        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        } else {
            // 如果没有 token 且请求不是针对登录/注册/刷新token的公共接口，则拒绝请求
            const publicPaths = ['/api/iam/auth/login', '/api/iam/auth/refresh-token', '/api/iam/auth/register'];
            if (!publicPaths.some(path => config.url?.includes(path))) {
                console.warn("AuthContext: No token found for authenticated request, logging out.");
                logout();
                return Promise.reject(new AxiosError("No authentication token provided.", "AUTH_REQUIRED", config, null, { status: 401, data: { message: "Authentication required." } } as any));
            }
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // 响应拦截器：处理 401 自动重试
    instance.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest: any = error.config;

        // 如果是 401 且没有重试过，并且不是 refresh-token 请求本身
        if (error.response?.status === 401 && !originalRequest._retry && !originalRequest.url.includes('/api/iam/auth/refresh-token')) {
          originalRequest._retry = true; // 标记重试，防止死循环
          console.log("AuthContext: 401 detected, attempting to refresh token and retry.");

          try {
            const newToken = await refreshAccessToken();
            if (newToken) {
              originalRequest.headers.Authorization = `Bearer ${newToken}`;
              return instance(originalRequest); // 重发原请求
            }
          } catch (refreshError) {
            console.error("AuthContext: Refresh token failed after 401, logging out.", refreshError);
            logout(); // 刷新失败，强制登出
            return Promise.reject(refreshError);
          }
        }
        return Promise.reject(error);
      }
    );

    return instance;
  }, [accessToken, refreshAccessToken, logout]); // 依赖 accessToken, refreshAccessToken, logout

  return (
    <AuthContext.Provider value={{
        isAuthenticated, user, login, logout, loading, accessToken,
        getAuthenticatedAxios, hasPermission, hasAnyRole
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
