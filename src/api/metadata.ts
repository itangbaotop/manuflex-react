import { AxiosInstance } from 'axios';

// 对应后端的 FieldType 枚举
export type FieldType = 'STRING' | 'NUMBER' | 'INTEGER' | 'BOOLEAN' | 'DATE' | 'DATETIME' | 'ENUM' | 'TEXT' | 'FILE' | 'REFERENCE';

export interface MetadataField {
  id: number;
  fieldName: string;
  fieldType: FieldType;
  required: boolean;
  defaultValue?: string;
  options?: string; // JSON string for ENUM
  description?: string;
  validationRule?: string;
}

export interface MetadataSchema {
  id: number;
  name: string;
  description: string;
  tenantId: string;
  fields: MetadataField[];
}

export const getSchemaByName = async (axios: AxiosInstance, tenantId: string, schemaName: string): Promise<MetadataSchema> => {
  const response = await axios.get('/api/metadata/schemas/by-name', {
    params: { name: schemaName, tenantId }
  });
  return response.data;
};