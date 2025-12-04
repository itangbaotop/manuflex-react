import type { AxiosInstance } from 'axios';

export interface DynamicData {
  id: number;
  tenantId: string;
  schemaName: string;
  data: { [key: string]: any };
  createdBy?: string;
  deptId?: number;
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
    ...filters
  };
  if (sortBy) {
    params.sortBy = sortBy;
    params.sortOrder = sortOrder;
  }
  const response = await axios.get(`/api/data/${tenantId}/${schemaName}`, { params });
  return response.data;
};

export const saveDynamicData = async (
  axios: AxiosInstance,
  tenantId: string,
  schemaName: string,
  data: any
): Promise<DynamicData> => {
  const response = await axios.post(`/api/data/${tenantId}/${schemaName}`, {
    tenantId,
    schemaName,
    data 
  });
  return response.data;
};

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

export const deleteDynamicData = async (
  axios: AxiosInstance,
  tenantId: string,
  schemaName: string,
  id: number
): Promise<void> => {
  await axios.delete(`/api/data/${tenantId}/${schemaName}/${id}`);
};