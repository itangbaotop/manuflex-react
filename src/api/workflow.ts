import type { AxiosInstance } from 'axios';

export interface ProcessDefinition {
  id: string;
  key: string;
  name: string;
  version: number;
  deploymentId: string;
  xml?: string;
  suspended: boolean;
  deploymentTime?: string;
}

export interface ProcessInstance {
  id: string;
  processDefinitionId: string;
  processDefinitionKey: string;
  businessKey?: string;
  startTime: string;
  endTime?: string;
  suspended: boolean;
  variables?: Record<string, any>;
}

export interface Task {
  id: string;
  name: string;
  processInstanceId: string;
  assignee?: string;
  candidateGroups?: string[];
  formKey?: string;
  variables?: Record<string, any>;
  createdAt: string;
  dueDate?: string;
  formSchema?: any[];
}

// 流程定义管理
export const getProcessDefinitions = (axios: AxiosInstance) =>
  axios.get<ProcessDefinition[]>('/api/workflow/process-definitions');

export const deployProcess = (axios: AxiosInstance, data: { name: string; xml: string }) =>
  axios.post<ProcessDefinition>('/api/workflow/deployments/string', { deploymentName: data.name, bpmnXml: data.xml, tenantId: 'default' });

export const getProcessDefinitionXml = (axios: AxiosInstance, id: string) =>
  axios.get<{ xml: string }>(`/api/workflow/process-definitions/${id}/xml`);

// 流程实例管理
export const startProcess = (axios: AxiosInstance, data: { processDefinitionKey: string; businessKey?: string; variables?: Record<string, any> }) =>
  axios.post<ProcessInstance>('/api/workflow/process-instances', { processDefinitionKey: data.processDefinitionKey, businessKey: data.businessKey, variables: data.variables, tenantId: 'default' });

export const getProcessInstances = (axios: AxiosInstance, params?: { processDefinitionKey?: string; businessKey?: string; includeFinished?: boolean }) =>
  axios.get<ProcessInstance[]>(
    params?.includeFinished ? '/api/workflow/process-instances/history' : '/api/workflow/process-instances/active', 
    { params: { ...params, tenantId: 'default' } }
  );

// 任务管理
export const getTasks = (axios: AxiosInstance, params?: { assignee?: string; candidateGroup?: string; processInstanceId?: string }) =>
  axios.get<Task[]>(params?.assignee ? `/api/workflow/tasks/by-assignee/${params.assignee}` : '/api/workflow/tasks/unassigned', { params: { tenantId: 'default' } });

export const completeTask = (axios: AxiosInstance, taskId: string, variables?: Record<string, any>) =>
  axios.post('/api/workflow/tasks/complete', { taskId, variables });

export const claimTask = (axios: AxiosInstance, taskId: string, assignee: string) =>
  axios.post('/api/workflow/tasks/claim', { taskId, assignee });

export const deleteDeployment = (axios: AxiosInstance, deploymentId: string) =>
  axios.delete(`/api/workflow/deployments/${deploymentId}?cascade=true`);