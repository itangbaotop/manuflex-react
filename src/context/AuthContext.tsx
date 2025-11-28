import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import axios, { AxiosError } from 'axios';
import type { AxiosInstance } from 'axios';
import { jwtDecode } from 'jwt-decode';

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
  getAuthenticatedAxios: (baseURL?: string) => AxiosInstance;
  hasPermission: (permission: string) => boolean;
  hasAnyRole: (roles: string[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// 1. 从环境变量读取 API 地址，如果未配置则回退到 localhost
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [user, setUser] = useState<UserInfo | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // 辅助函数：解析 Token 并更新状态
  const parseTokenAndSetUser = useCallback((token: string) => {
    try {
      const decodedToken: any = jwtDecode(token);
      
      // 解析 roles
      const roles = typeof decodedToken.roles === 'string' 
          ? decodedToken.roles.split(',') 
          : (decodedToken.roles || []);
      
      // 解析 permissions (兼容 authorities 或 scope 字段)
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
    } catch (e) {
      console.error("Token parsing failed", e);
      // 解析失败不直接 logout，避免死循环，而是由拦截器处理
    }
  }, []);

  const logout = useCallback(() => {
    console.log("Logging out user.");
    const currentToken = localStorage.getItem('accessToken');
    
    // 尝试通知后端登出（可选）
    if (currentToken) {
      axios.post(`${API_BASE_URL}/api/iam/auth/logout`, {}, {
        headers: { Authorization: `Bearer ${currentToken}` }
      }).catch(console.warn);
    }

    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    setAccessToken(null);
    setIsAuthenticated(false);
    setUser(null);
  }, []);

  // 核心逻辑：刷新 Token
  const refreshAccessToken = useCallback(async (): Promise<string | null> => {
    const storedRefreshToken = localStorage.getItem('refreshToken');
    if (!storedRefreshToken) {
      console.warn("No refresh token found.");
      logout();
      return null;
    }

    try {
      // 使用独立的 axios 实例避免拦截器死循环
      const response = await axios.post(`${API_BASE_URL}/api/iam/auth/refresh-token`, {
        refreshToken: storedRefreshToken,
      });
      
      const { accessToken: newAccessToken, refreshToken: newRefreshToken } = response.data;

      localStorage.setItem('accessToken', newAccessToken);
      localStorage.setItem('refreshToken', newRefreshToken);
      
      // 更新状态
      parseTokenAndSetUser(newAccessToken);
      console.log("Access token refreshed successfully.");
      return newAccessToken;
    } catch (error: any) {
      console.error("Failed to refresh access token:", error);
      logout();
      return null;
    }
  }, [logout, parseTokenAndSetUser]);

  // 初始化检查
  useEffect(() => {
    const checkAuthStatus = async () => {
      setLoading(true);
      const storedAccessToken = localStorage.getItem('accessToken');

      if (storedAccessToken) {
        try {
          const decodedToken: any = jwtDecode(storedAccessToken);
          // 检查 Token 是否过期 (exp 是秒，Date.now() 是毫秒)
          if (decodedToken.exp * 1000 > Date.now()) {
            parseTokenAndSetUser(storedAccessToken);
            console.log("Existing access token is valid.");
          } else {
            console.log("Access token expired, attempting to refresh.");
            await refreshAccessToken();
          }
        } catch (error) {
          console.error("Invalid token on init:", error);
          logout();
        }
      } else {
        setIsAuthenticated(false);
      }
      setLoading(false);
    };

    checkAuthStatus();
  }, [refreshAccessToken, logout, parseTokenAndSetUser]);

  const login = async (identifier: string, password: string) => {
    setLoading(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/api/iam/auth/login`, {
        identifier,
        password,
      });
      const { accessToken, refreshToken } = response.data;
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      parseTokenAndSetUser(accessToken);
    } catch (error) {
      setIsAuthenticated(false);
      setUser(null);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const hasPermission = useCallback((permission: string) => {
      if (!user) return false;
      if (user.roles.includes('ROLE_ADMIN')) return true; 
      return user.permissions.includes(permission);
  }, [user]);

  const hasAnyRole = useCallback((roles: string[]) => {
      if (!user) return false;
      return roles.some(role => user.roles.includes(role));
  }, [user]);

  // 核心逻辑：获取带拦截器的 Axios 实例
  const getAuthenticatedAxios = useCallback((baseURL?: string) => {
    const instance = axios.create({
      baseURL: baseURL || API_BASE_URL,
      headers: { 'Content-Type': 'application/json' },
    });

    // 请求拦截器：注入 Token
    instance.interceptors.request.use(
      async (config) => {
        let token = accessToken || localStorage.getItem('accessToken');
        
        // 如果内存中没有，尝试读取并检查是否需要刷新
        if (token) {
           const decoded: any = jwtDecode(token);
           if (decoded.exp * 1000 < Date.now()) {
               console.log("Token expired in request interceptor, refreshing...");
               token = await refreshAccessToken();
           }
        }

        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
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
        
        // 如果是 401 且没有重试过
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true; // 标记重试，防止死循环
          console.log("401 detected, attempting to refresh token and retry.");
          
          try {
            const newToken = await refreshAccessToken();
            if (newToken) {
              originalRequest.headers.Authorization = `Bearer ${newToken}`;
              return instance(originalRequest); // 重发原请求
            }
          } catch (refreshError) {
            return Promise.reject(refreshError);
          }
        }
        return Promise.reject(error);
      }
    );

    return instance;
  }, [accessToken, refreshAccessToken]);

  return (
    <AuthContext.Provider value={{ 
        isAuthenticated, user, login, logout, loading, accessToken, 
        getAuthenticatedAxios, hasPermission, hasAnyRole 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext)!;