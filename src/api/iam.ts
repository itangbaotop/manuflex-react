import { useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { publicApi } from './index';

// =======================================================
// IAM 模块的 DTO 类型定义
// =======================================================

export interface LoginRequest {
  identifier: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface UserDTO {
  id: string;
  username: string;
  email: string;
  enabled: boolean;
  roles: RoleDTO[]; // <--- **重要修改：改回 RoleDTO[]**
  // ... 其他用户属性
}

export interface UserCreateRequest {
  username: string;
  email: string;
  password?: string;
  roleIds?: string[];
}

export interface UserUpdateRequest {
  id: string;
  username?: string;
  email?: string;
  enabled?: boolean;
  roleIds?: string[];
}

export interface RoleDTO {
  id: string;
  name: string;
  description?: string;
  permissions: PermissionDTO[];
}

export interface RoleCreateRequest {
  name: string;
  description?: string;
  permissionIds?: string[];
}

export interface RoleUpdateRequest {
  id: string;
  name?: string;
  description?: string;
  permissionIds?: string[];
}

export interface PermissionDTO {
  id: string;
  name: string;
  code: string;
  description?: string;
}

export interface RolePermissionUpdateRequest {
  roleId: string;
  permissionIds: string[];
}

// =======================================================
// IAM 模块的 API 调用函数 (使用 useCallback 进行记忆)
// =======================================================

export const useIamApi = () => {
  const { getAuthenticatedAxios } = useAuth();

  const login = useCallback(async (data: LoginRequest): Promise<LoginResponse> => {
    const response = await publicApi.post<LoginResponse>('/api/iam/auth/login', data);
    return response.data;
  }, []);

  const refreshToken = useCallback(async (data: RefreshTokenRequest): Promise<LoginResponse> => {
    const response = await publicApi.post<LoginResponse>('/api/iam/auth/refresh-token', data);
    return response.data;
  }, []);

  const logout = useCallback(async (): Promise<void> => {
    const authAxios = getAuthenticatedAxios();
    await authAxios.post('/api/iam/auth/logout');
  }, [getAuthenticatedAxios]);

  const getUsers = useCallback(async (params?: any): Promise<UserDTO[]> => {
    const authAxios = getAuthenticatedAxios();
    const response = await authAxios.get('/api/iam/users', { params });
    return response.data;
  }, [getAuthenticatedAxios]);

  const getUserById = useCallback(async (id: string): Promise<UserDTO> => {
    const authAxios = getAuthenticatedAxios();
    const response = await authAxios.get(`/api/iam/users/${id}`);
    return response.data;
  }, [getAuthenticatedAxios]);

  const createUser = useCallback(async (data: UserCreateRequest): Promise<UserDTO> => {
    const authAxios = getAuthenticatedAxios();
    const response = await authAxios.post('/api/iam/users', data);
    return response.data;
  }, [getAuthenticatedAxios]);

  const updateUser = useCallback(async (id: string, data: UserUpdateRequest): Promise<UserDTO> => {
    const authAxios = getAuthenticatedAxios();
    const response = await authAxios.put(`/api/iam/users/${id}`, data);
    return response.data;
  }, [getAuthenticatedAxios]);

  const deleteUser = useCallback(async (id: string): Promise<void> => {
    const authAxios = getAuthenticatedAxios();
    await authAxios.delete(`/api/iam/users/${id}`);
  }, [getAuthenticatedAxios]);

  const getRoles = useCallback(async (): Promise<RoleDTO[]> => {
    const authAxios = getAuthenticatedAxios();
    const response = await authAxios.get('/api/iam/roles');
    return response.data;
  }, [getAuthenticatedAxios]);

  const getRoleById = useCallback(async (id: string): Promise<RoleDTO> => {
    const authAxios = getAuthenticatedAxios();
    const response = await authAxios.get(`/api/iam/roles/${id}`);
    return response.data;
  }, [getAuthenticatedAxios]);

  const createRole = useCallback(async (data: RoleCreateRequest): Promise<RoleDTO> => {
    const authAxios = getAuthenticatedAxios();
    const response = await authAxios.post('/api/iam/roles', data);
    return response.data;
  }, [getAuthenticatedAxios]);

  const updateRole = useCallback(async (id: string, data: RoleUpdateRequest): Promise<RoleDTO> => {
    const authAxios = getAuthenticatedAxios();
    const response = await authAxios.put(`/api/iam/roles/${id}`, data);
    return response.data;
  }, [getAuthenticatedAxios]);

  const deleteRole = useCallback(async (id: string): Promise<void> => {
    const authAxios = getAuthenticatedAxios();
    await authAxios.delete(`/api/iam/roles/${id}`);
  }, [getAuthenticatedAxios]);

  const updateRolePermissions = useCallback(async (roleId: string, permissionIds: string[]): Promise<void> => {
    const authAxios = getAuthenticatedAxios();
    await authAxios.put(`/api/iam/roles/${roleId}/permissions`, { permissionIds });
  }, [getAuthenticatedAxios]);

  const getAllPermissions = useCallback(async (): Promise<PermissionDTO[]> => {
    const authAxios = getAuthenticatedAxios();
    const response = await authAxios.get('/api/iam/permissions');
    return response.data;
  }, [getAuthenticatedAxios]);

  return {
    login,
    refreshToken,
    logout,
    getUsers,
    getUserById,
    createUser,
    updateUser,
    deleteUser,
    getRoles,
    getRoleById,
    createRole,
    updateRole,
    deleteRole,
    updateRolePermissions,
    getAllPermissions,
  };
};