import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import axios, { AxiosInstance } from 'axios';
import { jwtDecode } from 'jwt-decode';

interface AuthContextType {
  isAuthenticated: boolean;
  user: any | null;
  login: (identifier: string, password: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
  accessToken: string | null;
  getAuthenticatedAxios: (baseURL?: string) => AxiosInstance;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [user, setUser] = useState<any | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const API_BASE_URL = 'http://localhost:8080';

  const logout = useCallback(() => {
    console.log("Logging out user.");
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    setAccessToken(null);
    setIsAuthenticated(false);
    setUser(null);
    const currentAccessToken = localStorage.getItem('accessToken');
    if (currentAccessToken) {
      axios.post(`${API_BASE_URL}/api/iam/auth/logout`, {}, {
        headers: { Authorization: `Bearer ${currentAccessToken}` }
      }).catch(error => console.error("Logout failed on server:", error));
    }
  }, []);

  const refreshAccessToken = useCallback(async (): Promise<string | null> => {
    const storedRefreshToken = localStorage.getItem('refreshToken');
    if (!storedRefreshToken) {
      console.warn("No refresh token found. User needs to log in.");
      logout();
      return null;
    }

    try {
      const response = await axios.post(`${API_BASE_URL}/api/iam/auth/refresh-token`, {
        refreshToken: storedRefreshToken,
      });
      const { accessToken: newAccessToken, refreshToken: newRefreshToken, user: newUserInfo } = response.data;

      localStorage.setItem('accessToken', newAccessToken);
      localStorage.setItem('refreshToken', newRefreshToken);
      setAccessToken(newAccessToken);
      setIsAuthenticated(true);
      // ⬅️ 确保 roles 是数组
      const userRoles = typeof newUserInfo.roles === 'string' ? newUserInfo.roles.split(',') : newUserInfo.roles || [];
      setUser({ ...newUserInfo, roles: userRoles });
      console.log("Access token refreshed successfully.");
      return newAccessToken;
    } catch (error: any) {
      console.error("Failed to refresh access token:", error.response?.data?.message || error.message);
      logout();
      throw error;
    }
  }, [logout]);

  useEffect(() => {
    const checkAuthStatus = async () => {
      setLoading(true);
      const storedAccessToken = localStorage.getItem('accessToken');

      if (storedAccessToken) {
        try {
          const decodedToken: any = jwtDecode(storedAccessToken);
          if (decodedToken.exp * 1000 > Date.now()) {
            setAccessToken(storedAccessToken);
            setIsAuthenticated(true);
            // ⬅️ 确保 roles 是数组
            const decodedRoles = typeof decodedToken.roles === 'string' ? decodedToken.roles.split(',') : decodedToken.roles || [];
            setUser({ username: decodedToken.sub, roles: decodedRoles, tenantId: decodedToken.tenantId });
            console.log("Existing access token is valid.");
          } else {
            console.log("Access token expired, attempting to refresh.");
            await refreshAccessToken();
          }
        } catch (error) {
          console.error("Invalid access token or refresh failed during initial check:", error);
          logout();
        }
      } else {
        console.log("No access token found in local storage.");
        setIsAuthenticated(false);
        setUser(null);
      }
      setLoading(false);
    };

    checkAuthStatus();
  }, [refreshAccessToken, logout]);

  const login = async (identifier: string, password: string) => {
    setLoading(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/api/iam/auth/login`, {
        identifier,
        password,
      });
      const { accessToken, refreshToken, user: userInfo } = response.data;
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      setAccessToken(accessToken);
      setIsAuthenticated(true);
      // ⬅️ 确保 roles 是数组
      const userRoles = typeof userInfo.roles === 'string' ? userInfo.roles.split(',') : userInfo.roles || [];
      setUser({ ...userInfo, roles: userRoles });
      console.log("Login successful.");
    } catch (error: any) {
      console.error("Login failed:", error.response?.data?.message || error.message);
      setIsAuthenticated(false);
      setUser(null);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const getAuthenticatedAxios = useCallback((baseURL?: string) => {
    const instance = axios.create({
      baseURL: baseURL || API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    instance.interceptors.request.use(
      async (config) => {
        let currentToken = accessToken;
        if (currentToken) {
            const decodedToken: any = jwtDecode(currentToken);
            if (decodedToken?.exp * 1000 < Date.now()) {
                console.log("Token expired or missing for authenticated request, attempting refresh.");
                try {
                    currentToken = await refreshAccessToken();
                    if (!currentToken) {
                        throw new Error("Failed to get a valid access token after refresh.");
                    }
                } catch (error) {
                    console.error("Failed to refresh token in interceptor:", error);
                    return Promise.reject(error);
                }
            }
        } else {
            console.log("No access token found, attempting to refresh.");
            try {
                currentToken = await refreshAccessToken();
                if (!currentToken) {
                    throw new Error("Failed to get a valid access token after refresh.");
                }
            } catch (error) {
                console.error("Failed to refresh token in interceptor:", error);
                return Promise.reject(error);
            }
        }

        if (currentToken) {
          config.headers.Authorization = `Bearer ${currentToken}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    return instance;
  }, [accessToken, refreshAccessToken]);

  const value = {
    isAuthenticated,
    user,
    login,
    logout,
    loading,
    accessToken,
    getAuthenticatedAxios,
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontSize: '24px' }}>
        Loading authentication status...
      </div>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
