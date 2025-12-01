import type { AxiosInstance } from 'axios'; // 使用 type 导入
import { useAuth } from '../context/AuthContext';

// =======================================================
// Dynamic Data 模块的 DTO 类型定义
// 这些应该与你的后端 platform-data-service 的 DTO 保持一致
// =======================================================

export interface FilterRequestDTO {
  fieldName: string;
  operator: 'EQ' | 'NE' | 'GT' | 'GE' | 'LT' | 'LE' | 'LIKE' | 'IN'; // 等于, 不等于, 大于, 大于等于, 小于, 小于等于, 模糊匹配, 包含
  value: string; // 统一为字符串，后端根据字段类型转换
}

export interface PageRequestDTO {
  page: number; // 页码，从0开始
  size: number; // 每页大小
  sortBy?: string; // 排序字段
  sortOrder?: 'asc' | 'desc'; // 排序顺序
  filters?: FilterRequestDTO[]; // 过滤条件
}

export interface PageResponseDTO<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number; // 当前页码 (从0开始)
  first: boolean;
  last: boolean;
  empty: boolean;
}

export type DynamicDataCreateRequest = Record<string, any>;
export type DynamicDataUpdateRequest = Record<string, any>;
export type DynamicDataResponse = Record<string, any>;

// =======================================================
// Dynamic Data 模块的 API 调用 Hook
// =======================================================

export const useDynamicDataApi = () => {
  const { getAuthenticatedAxios } = useAuth();

  return {
    getDynamicData: async (schemaName: string, pageRequest: PageRequestDTO): Promise<PageResponseDTO<DynamicDataResponse>> => {
      const authAxios = getAuthenticatedAxios();
      const response = await authAxios.post(`/api/data/${schemaName}/list`, pageRequest);
      return response.data;
    },

    createDynamicData: async (schemaName: string, data: DynamicDataCreateRequest): Promise<DynamicDataResponse> => {
      const authAxios = getAuthenticatedAxios();
      const response = await authAxios.post(`/api/data/${schemaName}`, data);
      return response.data;
    },

    updateDynamicData: async (schemaName: string, id: string, data: DynamicDataUpdateRequest): Promise<DynamicDataResponse> => {
      const authAxios = getAuthenticatedAxios();
      const response = await authAxios.put(`/api/data/${schemaName}/${id}`, data);
      return response.data;
    },

    deleteDynamicData: async (schemaName: string, id: string): Promise<void> => {
      const authAxios = getAuthenticatedAxios();
      await authAxios.delete(`/api/data/${schemaName}/${id}`);
    },
  };
};
