import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
// 使用 import type 避免 Vite 报错
import type { ReactNode } from 'react';
import axios from 'axios';
import type { AxiosInstance } from 'axios';
import { jwtDecode } from 'jwt-decode';

interface UserInfo {
  username: string;
  email?: string;
  tenantId: string;
  roles: string[];
  permissions: string[];
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

// 开发环境使用空字符串触发 Vite 代理
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [user, setUser] = useState<UserInfo | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // 解析 Token 并设置用户状态
  const parseTokenAndSetUser = useCallback((token: string) => {
    try {
      const decoded: any = jwtDecode(token);
      
      // 兼容处理 roles: 可能是字符串也可能是数组
      const roles = typeof decoded.roles === 'string' 
          ? decoded.roles.split(',') 
          : (Array.isArray(decoded.roles) ? decoded.roles : []);

      // 兼容处理 permissions
      const permissions = Array.isArray(decoded.permissions) ? decoded.permissions : [];

      setUser({
        username: decoded.sub,
        tenantId: decoded.tenantId,
        roles: roles,
        permissions: permissions
      });
      setIsAuthenticated(true);
      setAccessToken(token);
    } catch (e) {
      console.error("Token parsing failed", e);
      logout();
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    setAccessToken(null);
    setIsAuthenticated(false);
    setUser(null);
  }, []);

  const refreshAccessToken = useCallback(async (): Promise<string | null> => {
    const storedRefreshToken = localStorage.getItem('refreshToken');
    if (!storedRefreshToken) {
      logout();
      return null;
    }
    try {
      const response = await axios.post(`${API_BASE_URL}/api/iam/auth/refresh-token`, {
        refreshToken: storedRefreshToken,
      });
      const { accessToken: newAccessToken, refreshToken: newRefreshToken } = response.data;
      localStorage.setItem('accessToken', newAccessToken);
      localStorage.setItem('refreshToken', newRefreshToken);
      parseTokenAndSetUser(newAccessToken);
      return newAccessToken;
    } catch (error) {
      console.error("Refresh failed", error);
      logout();
      return null;
    }
  }, [logout, parseTokenAndSetUser]);

  // 初始化检查
  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('accessToken');
      if (token) {
        try {
          const decoded: any = jwtDecode(token);
          if (decoded.exp * 1000 > Date.now()) {
            parseTokenAndSetUser(token);
          } else {
            await refreshAccessToken();
          }
        } catch {
          logout();
        }
      }
      setLoading(false);
    };
    initAuth();
  }, [refreshAccessToken, logout, parseTokenAndSetUser]);

  const login = async (identifier: string, password: string) => {
    const response = await axios.post(`${API_BASE_URL}/api/iam/auth/login`, { identifier, password });
    const { accessToken, refreshToken } = response.data;
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    parseTokenAndSetUser(accessToken);
  };

  const getAuthenticatedAxios = useCallback((baseURL?: string) => {
    const instance = axios.create({
      baseURL: baseURL || API_BASE_URL,
      headers: { 'Content-Type': 'application/json' },
    });
    instance.interceptors.request.use(async (config) => {
      let token = accessToken || localStorage.getItem('accessToken');
      if (token) {
         const decoded: any = jwtDecode(token);
         if (decoded.exp * 1000 < Date.now()) {
             token = await refreshAccessToken();
         }
         if (token) config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });
    return instance;
  }, [accessToken, refreshAccessToken]);

  const hasPermission = useCallback((permission: string) => {
      if (!user) return false;
      // 超级管理员拥有所有权限
      if (user.roles.includes('ROLE_ADMIN')) return true;
      // 检查 permissions 数组是否存在该权限
      console.log("User Permissions:", user.permissions);
      return user.permissions?.includes(permission) || false;
  }, [user]);

  const hasAnyRole = useCallback((roles: string[]) => {
      if (!user) return false;
      return roles.some(role => user.roles.includes(role));
  }, [user]);

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