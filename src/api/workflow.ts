import axios, { AxiosInstance } from 'axios';
import { useAuth } from '../context/AuthContext';

// API Gateway 的基础 URL
const API_BASE_URL = 'http://localhost:8080';

// 定义 DTOs (通常从后端的 platform-workflow-api 模块复制过来)
interface TaskResponse {
  id: string;
  name: string;
  assignee: string;
  owner: string | null;
  createTime: string;
  dueDate: string | null;
  followUpDate: string | null;
  description: string | null;
  priority: string;
  processInstanceId: string;
  processDefinitionId: string;
  taskDefinitionKey: string;
  tenantId: string;
  variables: { [key: string]: any };
}

interface ClaimTaskRequest {
  taskId: string;
  assignee: string;
}

interface CompleteTaskRequest {
  taskId: string;
  variables: { [key: string]: any };
}

// 创建一个 Axios 实例，用于 Workflow 相关的请求
// ⚠️ 注意：这里不能直接创建 workflowApi，因为 useAuth 是一个 Hook。
// 我们需要在组件中使用 useAuth().getAuthenticatedAxios() 来获取实例。

export const getTasksByAssignee = async (authenticatedAxios: AxiosInstance, assignee: string, tenantId: string): Promise<TaskResponse[]> => {
  const response = await authenticatedAxios.get(`${API_BASE_URL}/api/workflow/tasks/by-assignee/${assignee}`, {
    params: { tenantId }
  });
  return response.data;
};

export const claimTask = async (authenticatedAxios: AxiosInstance, request: ClaimTaskRequest): Promise<void> => {
  await authenticatedAxios.post(`${API_BASE_URL}/api/workflow/tasks/claim`, request);
};

export const completeTask = async (authenticatedAxios: AxiosInstance, request: CompleteTaskRequest): Promise<void> => {
  await authenticatedAxios.post(`${API_BASE_URL}/api/workflow/tasks/complete`, request);
};

export const unclaimTask = async (authenticatedAxios: AxiosInstance, taskId: string): Promise<void> => {
  await authenticatedAxios.post(`${API_BASE_URL}/api/workflow/tasks/unclaim/${taskId}`);
};

// 可以在这里添加其他工作流任务相关的 API，例如获取未分配任务、根据流程实例ID获取任务等
