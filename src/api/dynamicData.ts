import type { AxiosInstance } from 'axios';

export interface DynamicData {
  id: number;
  tenantId: string;
  schemaName: string;
  data: { [key: string]: any };
  createdAt: string;
  updatedAt: string;
}

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  page: number;
  size: number;
  totalPages: number;
}

// 支持排序和过滤的查询接口
export const searchDynamicData = async (
  axios: AxiosInstance,
  tenantId: string,
  schemaName: string,
  page: number = 0,
  size: number = 10,
  filters: { [key: string]: any } = {},
  sortBy?: string,
  sortOrder?: 'asc' | 'desc'
): Promise<PageResponse<DynamicData>> => {
  const params: any = {
    page,
    size,
    ...filters // 展开过滤条件，例如 { "name.like": "abc" }
  };

  if (sortBy) {
    params.sortBy = sortBy;
    params.sortOrder = sortOrder;
  }

  const response = await axios.get(`/api/data/${tenantId}/${schemaName}`, { params });
  return response.data;
};

// 通用保存接口
export const saveDynamicData = async (
  axios: AxiosInstance,
  tenantId: string,
  schemaName: string,
  data: any
): Promise<DynamicData> => {
  const response = await axios.post(`/api/data/${tenantId}/${schemaName}`, {
    tenantId,
    schemaName,
    data // 包装在 data 字段中
  });
  return response.data;
};

// 通用更新接口
export const updateDynamicData = async (
  axios: AxiosInstance,
  tenantId: string,
  schemaName: string,
  id: number,
  data: any
): Promise<DynamicData> => {
  const response = await axios.put(`/api/data/${tenantId}/${schemaName}/${id}`, data);
  return response.data;
};

// 通用删除接口
export const deleteDynamicData = async (
  axios: AxiosInstance,
  tenantId: string,
  schemaName: string,
  id: number
): Promise<void> => {
  await axios.delete(`/api/data/${tenantId}/${schemaName}/${id}`);
};