import { AxiosInstance } from 'axios';

// 对应后端的 UserDTO
export interface User {
  id: number;
  username: string;
  email: string;
  tenantId: string;
  roles: string[]; // 后端返回的是 Set<String> role names
  createdAt: string;
}

// 对应后端的 Role 实体
export interface Role {
  id: number;
  name: string;
  description: string;
}

// 注册/创建用户 Payload
export interface CreateUserRequest {
    username: string;
    email: string;
    password?: string; // 仅创建时需要
    tenantId: string;
}

// 获取所有用户
export const getUsers = async (axios: AxiosInstance): Promise<User[]> => {
  const response = await axios.get('/api/iam/users');
  return response.data;
};

// 创建用户 (这里复用注册接口作为管理员创建用户的手段)
export const createUser = async (axios: AxiosInstance, user: CreateUserRequest): Promise<User> => {
  const response = await axios.post('/api/iam/auth/register', user);
  return response.data;
};

// 删除用户
export const deleteUser = async (axios: AxiosInstance, id: number): Promise<void> => {
  await axios.delete(`/api/iam/users/${id}`);
};

// 获取所有角色
export const getRoles = async (axios: AxiosInstance): Promise<Role[]> => {
  const response = await axios.get('/api/iam/roles');
  return response.data;
};