import type { AxiosInstance } from 'axios';

export interface Department {
  id: number;
  name: string;
  parentId: number;
  sortOrder: number;
  leader?: string;
  phone?: string;
  email?: string;
  status: boolean; // true: 正常, false: 停用
  children?: Department[];
}

// 获取部门树
export const getDepartmentTree = async (axios: AxiosInstance): Promise<Department[]> => {
  const response = await axios.get('/api/iam/departments');
  return response.data;
};

// 创建部门
export const createDepartment = async (axios: AxiosInstance, data: Partial<Department>): Promise<Department> => {
  const response = await axios.post('/api/iam/departments', data);
  return response.data;
};

// 更新部门
export const updateDepartment = async (axios: AxiosInstance, id: number, data: Partial<Department>): Promise<Department> => {
  const response = await axios.put(`/api/iam/departments/${id}`, data);
  return response.data;
};

// 删除部门
export const deleteDepartment = async (axios: AxiosInstance, id: number): Promise<void> => {
  await axios.delete(`/api/iam/departments/${id}`);
};