import type { AxiosInstance } from 'axios';

// =======================================================
// Metadata 模块的 DTO 类型定义
// 这些应该与你的后端 platform-metadata-service 的 DTO 保持一致
// =======================================================

export interface MetadataFieldDTO {
  id: string;
  schemaId: string;
  fieldName: string;
  fieldType: 'STRING' | 'NUMBER' | 'BOOLEAN' | 'DATE' | 'ENUM' | 'TEXTAREA'; // 字段类型，与后端 FieldType 枚举对应
  label: string; // 字段显示名称
  required: boolean;
  defaultValue?: any;
  options?: string[]; // 针对 ENUM 类型
  orderNum: number;
  // ... 其他字段属性
}

export interface MetadataSchemaDTO {
  id: string;
  name: string; // Schema 唯一名称，用于动态路由
  description: string; // Schema 显示名称
  fields: MetadataFieldDTO[]; // 包含的字段列表
  tenantId: string;
  // ... 其他 Schema 属性
}

export interface MetadataSchemaCreateRequest {
  name: string;
  description: string;
  // tenantId 会在后端根据当前用户上下文自动添加
}

export interface MetadataSchemaUpdateRequest {
  id: string;
  name?: string;
  description?: string;
}

export interface MetadataFieldCreateRequest {
  schemaId: string;
  fieldName: string;
  fieldType: 'STRING' | 'NUMBER' | 'BOOLEAN' | 'DATE' | 'ENUM' | 'TEXTAREA';
  label: string;
  required: boolean;
  defaultValue?: any;
  options?: string[];
  orderNum: number;
}

export interface MetadataFieldUpdateRequest {
  id: string;
  fieldName?: string;
  fieldType?: 'STRING' | 'NUMBER' | 'BOOLEAN' | 'DATE' | 'ENUM' | 'TEXTAREA';
  label?: string;
  required?: boolean;
  defaultValue?: any;
  options?: string[];
  orderNum?: number;
}


// =======================================================
// Metadata 模块的 API 调用函数
// =======================================================

/**
 * 获取元数据 Schema 列表
 * @param authAxios 经过认证的 Axios 实例
 * @param tenantId 租户ID
 * @returns Promise<MetadataSchemaDTO[]>
 */
export const getSchemas = async (authAxios: AxiosInstance, tenantId: string): Promise<MetadataSchemaDTO[]> => {
  const response = await authAxios.get(`/api/metadata/schemas/by-tenant/${tenantId}`);
  return response.data;
};

/**
 * 根据 ID 获取元数据 Schema 详情
 * @param authAxios 经过认证的 Axios 实例
 * @param id Schema ID
 * @returns Promise<MetadataSchemaDTO>
 */
export const getSchemaById = async (authAxios: AxiosInstance, id: string): Promise<MetadataSchemaDTO> => {
  const response = await authAxios.get(`/api/metadata/schemas/${id}`);
  return response.data;
};

/**
 * 创建新的元数据 Schema
 * @param authAxios 经过认证的 Axios 实例
 * @param data Schema 创建请求体
 * @returns Promise<MetadataSchemaDTO>
 */
export const createSchema = async (authAxios: AxiosInstance, data: MetadataSchemaCreateRequest): Promise<MetadataSchemaDTO> => {
  const response = await authAxios.post('/api/metadata/schemas', data);
  return response.data;
};

/**
 * 更新元数据 Schema
 * @param authAxios 经过认证的 Axios 实例
 * @param id Schema ID
 * @param data Schema 更新请求体
 * @returns Promise<MetadataSchemaDTO>
 */
export const updateSchema = async (authAxios: AxiosInstance, id: string, data: MetadataSchemaUpdateRequest): Promise<MetadataSchemaDTO> => {
  const response = await authAxios.put(`/api/metadata/schemas/${id}`, data);
  return response.data;
};

/**
 * 删除元数据 Schema
 * @param authAxios 经过认证的 Axios 实例
 * @param id Schema ID
 * @returns Promise<void>
 */
export const deleteSchema = async (authAxios: AxiosInstance, id: string): Promise<void> => {
  await authAxios.delete(`/api/metadata/schemas/${id}`);
};

/**
 * 获取某个 Schema 下的字段列表
 * @param authAxios 经过认证的 Axios 实例
 * @param schemaId Schema ID
 * @returns Promise<MetadataFieldDTO[]>
 */
export const getFieldsBySchemaId = async (authAxios: AxiosInstance, schemaId: string): Promise<MetadataFieldDTO[]> => {
  const response = await authAxios.get(`/api/metadata/schemas/${schemaId}/fields`);
  return response.data;
};

/**
 * 创建新的元数据字段
 * @param authAxios 经过认证的 Axios 实例
 * @param data 字段创建请求体
 * @returns Promise<MetadataFieldDTO>
 */
export const createField = async (authAxios: AxiosInstance, data: MetadataFieldCreateRequest): Promise<MetadataFieldDTO> => {
  const response = await authAxios.post(`/api/metadata/fields`, data);
  return response.data;
};

/**
 * 更新元数据字段
 * @param authAxios 经过认证的 Axios 实例
 * @param id 字段 ID
 * @param data 字段更新请求体
 * @returns Promise<MetadataFieldDTO>
 */
export const updateField = async (authAxios: AxiosInstance, id: string, data: MetadataFieldUpdateRequest): Promise<MetadataFieldDTO> => {
  const response = await authAxios.put(`/api/metadata/fields/${id}`, data);
  return response.data;
};

/**
 * 删除元数据字段
 * @param authAxios 经过认证的 Axios 实例
 * @param id 字段 ID
 * @returns Promise<void>
 */
export const deleteField = async (authAxios: AxiosInstance, id: string): Promise<void> => {
  await authAxios.delete(`/api/metadata/fields/${id}`);
};
