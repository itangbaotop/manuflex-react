import type { AxiosInstance } from 'axios';

// ==========================================
// 1. 数据类型定义 (Types)
// ==========================================

export interface Permission {
  id: number;
  code: string;        // 权限标识，如 "user:read"
  name: string;        // 显示名称，如 "查看用户"
  description: string; // 详细描述
}

export interface Role {
  id: number;
  name: string;
  description: string;
  permissions?: Permission[];
}

export interface User {
  id: number;
  username: string;
  email: string;
  tenantId: string;
  roles: string[];     // 角色名列表
  enabled: boolean;
  createdAt: string;
}

// ... (CreateUserRequest, UpdateUserRequest 保持不变) ...
export interface CreateUserRequest {
    username: string;
    email: string;
    password?: string;
    tenantId: string;
    roles?: string[];
}

export interface UpdateUserRequest {
    email?: string;
    roles?: string[];
    enabled?: boolean;
}

// ==========================================
// 2. 接口方法 (Methods)
// ==========================================

export const getUsers = async (axios: AxiosInstance): Promise<User[]> => {
  const response = await axios.get('/api/iam/users');
  return response.data;
};

export const createUser = async (axios: AxiosInstance, user: Partial<CreateUserRequest>): Promise<User> => {
  const response = await axios.post('/api/iam/auth/register', user);
  return response.data;
};

export const updateUser = async (axios: AxiosInstance, id: number, data: UpdateUserRequest): Promise<User> => {
  const response = await axios.put(`/api/iam/users/${id}`, data);
  return response.data;
};

export const deleteUser = async (axios: AxiosInstance, id: number): Promise<void> => {
  await axios.delete(`/api/iam/users/${id}`);
};

export const getRoles = async (axios: AxiosInstance): Promise<Role[]> => {
  const response = await axios.get('/api/iam/roles');
  return response.data;
};

export const createRole = async (axios: AxiosInstance, role: { name: string; description: string }): Promise<Role> => {
  const response = await axios.post('/api/iam/roles', role);
  return response.data;
};

export const deleteRole = async (axios: AxiosInstance, id: number): Promise<void> => {
  await axios.delete(`/api/iam/roles/${id}`);
};

// 更新角色权限
export const updateRolePermissions = async (axios: AxiosInstance, roleId: number, permissionIds: number[]): Promise<Role> => {
  // 注意：后端接口路径是 /api/iam/roles/{id}/permissions
  const response = await axios.put(`/api/iam/roles/${roleId}/permissions`, { 
      roleId, 
      permissionIds 
  });
  return response.data;
};

// 获取所有权限
export const getAllPermissions = async (axios: AxiosInstance): Promise<Permission[]> => {
  const response = await axios.get('/api/iam/permissions');
  return response.data;
};

export const resetPassword = async (axios: AxiosInstance, userId: number, password: string): Promise<void> => {
  await axios.put(`/api/iam/users/${userId}/password`, { password });
};