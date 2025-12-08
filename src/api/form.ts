import type { AxiosInstance } from 'axios';

export interface FormDefinition {
  id: string;
  formKey: string;
  name: string;
  schema: any; // JSON Schema
  createdAt: string;
  updatedAt: string;
}

export interface FormData {
  id: string;
  formKey: string;
  data: Record<string, any>;
  submittedBy: string;
  submittedAt: string;
}

// 表单定义管理
export const getFormDefinitions = (axios: AxiosInstance) =>
  axios.get<FormDefinition[]>('/api/workflow/forms/definitions');

export const createFormDefinition = (axios: AxiosInstance, data: { key: string; name: string; schema: any }) =>
  axios.post<FormDefinition>('/api/workflow/forms/definitions', data);

export const deleteFormDefinition = (axios: AxiosInstance, id: string) =>
  axios.delete(`/api/workflow/forms/definitions/${id}`);

export const updateFormDefinition = (axios: AxiosInstance, id: string, data: { name?: string; schema?: any }) =>
  axios.put<FormDefinition>(`/api/workflow/forms/definitions/${id}`, data);

export const getFormDefinition = (axios: AxiosInstance, key: string) =>
  axios.get<FormDefinition>(`/api/workflow/forms/definitions/${key}`);

// 表单数据管理
export const submitFormData = (axios: AxiosInstance, data: { formKey: string; data: Record<string, any> }) =>
  axios.post<FormData>('/api/workflow/forms/data', data);

export const getFormData = (axios: AxiosInstance, params?: { formKey?: string; submittedBy?: string }) =>
  axios.get<FormData[]>('/api/workflow/forms/data', { params });