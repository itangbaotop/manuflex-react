import type { AxiosInstance } from 'axios';

export interface AgentInfo {
  type: string;
  name: string;
  description: string;
}

export interface AgentResult {
  success: boolean;
  message: string;
  data: any;
  error?: string;
  executionTime: number;
  metadata?: Record<string, any>;
}

export interface ExecuteRequest {
  input: string;
  tenantId: string;
}

export interface FormField {
  name: string;
  label: string;
  type: string;
  required: boolean;
  options?: string[];
}

export interface FormConfig {
  formName: string;
  description: string;
  fields: FormField[];
  schemaId?: number;
  created?: boolean;
}

// 获取所有可用的Agent
export const getAgents = async (axios: AxiosInstance): Promise<AgentInfo[]> => {
  const response = await axios.get('/api/agent/list');
  return response.data;
};

// 执行Agent任务
export const executeAgent = async (
  axios: AxiosInstance,
  input: string,
  tenantId: string
): Promise<AgentResult> => {
  const response = await axios.post('/api/agent/execute', {
    input,
    tenantId
  });
  return response.data;
};

// 生成表单
export const generateForm = async (
  axios: AxiosInstance,
  description: string,
  tenantId: string
): Promise<FormConfig> => {
  const result = await executeAgent(axios, `创建表单：${description}`, tenantId);
  if (result.success) {
    return result.data as FormConfig;
  }
  throw new Error(result.error || '表单生成失败');
};