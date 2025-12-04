import type { AxiosInstance } from 'axios';

export type FieldType = 'STRING' | 'NUMBER' | 'INTEGER' | 'BOOLEAN' | 'DATE' | 'DATETIME' | 'ENUM' | 'TEXT' | 'FILE' | 'REFERENCE';

export interface MetadataField {
  id?: number;
  fieldName: string;
  fieldType: FieldType;
  required: boolean;
  defaultValue?: string;
  options?: string; // JSON string for ENUM
  description?: string;
  validationRule?: string;
  relatedSchemaName?: string;
  relatedFieldName?: string;
}

export interface MetadataSchema {
  id: number;
  name: string;
  description: string;
  tenantId: string;
  fields?: MetadataField[];
}


export const getSchemas = async (axios: AxiosInstance, tenantId: string): Promise<MetadataSchema[]> => {
    const response = await axios.get(`/api/metadata/schemas/by-tenant/${tenantId}`);
    return response.data;
};

export const getSchemaByName = async (axios: AxiosInstance, tenantId: string, schemaName: string): Promise<MetadataSchema> => {
  const response = await axios.get('/api/metadata/schemas/by-name', {
    params: { name: schemaName, tenantId }
  });
  return response.data;
};

export const createSchema = async (axios: AxiosInstance, data: Partial<MetadataSchema>) => {
    const response = await axios.post('/api/metadata/schemas', data);
    return response.data;
};

export const updateSchema = async (axios: AxiosInstance, id: number, data: Partial<MetadataSchema>) => {
    const response = await axios.put(`/api/metadata/schemas/${id}`, data);
    return response.data;
};

export const deleteSchema = async (axios: AxiosInstance, id: number) => {
    await axios.delete(`/api/metadata/schemas/${id}`);
};


// 创建字段：路径改为 /api/metadata/schemas/{schemaId}/fields
export const createField = async (axios: AxiosInstance, schemaId: number, field: MetadataField) => {
    const response = await axios.post(`/api/metadata/schemas/${schemaId}/fields`, field);
    return response.data;
};

// 更新字段：路径改为 /api/metadata/schemas/{schemaId}/fields/{id}
export const updateField = async (axios: AxiosInstance, schemaId: number, fieldId: number, field: MetadataField) => {
    const response = await axios.put(`/api/metadata/schemas/${schemaId}/fields/${fieldId}`, field);
    return response.data;
};

// 删除字段：路径改为 /api/metadata/schemas/{schemaId}/fields/{id}
export const deleteField = async (axios: AxiosInstance, schemaId: number, fieldId: number) => {
    await axios.delete(`/api/metadata/schemas/${schemaId}/fields/${fieldId}`);
};

// === 数据库同步 ===
export const syncDatabaseTable = async (axios: AxiosInstance, schemaId: number) => {
    await axios.post(`/api/data/tables/${schemaId}`);
};