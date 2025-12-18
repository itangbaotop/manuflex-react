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

// 定义流式回调
type StreamCallbacks = {
  onMessage: (chunk: string) => void;
  onError: (error: Error) => void;
  onComplete: () => void;
};

// 获取所有可用的Agent
export const getAgents = async (axios: AxiosInstance): Promise<AgentInfo[]> => {
  const response = await axios.get('/api/agent/list');
  return response.data;
};

// // 执行Agent任务
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

/**
 * 流式执行 Agent 任务 (修复版)
 * 1. 使用相对路径 /api/... 避免 CORS OPTIONS 弹窗
 * 2. 手动处理 Token 引号问题
 * 3. 手动处理 401 跳转
 */
export async function streamAgentExecute(
  params: { input: string },
  callbacks: StreamCallbacks
) {
  // 获取并清洗 Token (去除可能存在的首尾引号)
  let token = localStorage.getItem('accessToken');
  if (token && token.startsWith('"') && token.endsWith('"')) {
    token = token.slice(1, -1);
  }

  const apiUrl = '/api/agent/stream'; 

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(params)
    });

    // 处理 Token 失效
    if (response.status === 401) {
      console.warn('Token expired, redirecting...');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
      return;
    }

    if (!response.ok) {
      throw new Error(`请求失败: ${response.status}`);
    }

    if (!response.body) {
      throw new Error('ReadableStream not supported.');
    }

    // 开始读取流
    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');

    while (true) {
      const { done, value } = await reader.read();
      
      if (done) {
        callbacks.onComplete();
        break;
      }

      const chunk = decoder.decode(value, { stream: true });
      callbacks.onMessage(chunk);
    }

  } catch (error) {
    callbacks.onError(error instanceof Error ? error : new Error('Unknown error'));
  }
}

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