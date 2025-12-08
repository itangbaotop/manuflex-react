import type { AxiosInstance } from 'axios';

export interface DmnDefinition {
  id: string;
  key: string;
  name: string;
  version: number;
  xml?: string;
  createdAt: string;
}

export interface DecisionResult {
  decisionKey: string;
  result: any;
  executedAt: string;
}

// DMN规则管理
export const getDmnDefinitions = (axios: AxiosInstance) =>
  axios.get<DmnDefinition[]>('/api/workflow/decision/definitions', { params: { tenantId: 'default' } });

export const deployDmn = (axios: AxiosInstance, data: { name: string; xml: string }) => {
  const formData = new FormData();
  const blob = new Blob([data.xml], { type: 'application/xml' });
  formData.append('dmnFile', blob, `${data.name}.dmn`);
  formData.append('deploymentName', data.name);
  formData.append('tenantId', 'default');
  return axios.post<DmnDefinition>('/api/workflow/decision/deployments', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
};

export const getDmnDefinitionXml = (axios: AxiosInstance, id: string) =>
  axios.get<{ xml: string }>(`/api/workflow/decision/definitions/${id}/xml`);

export const evaluateDecision = (axios: AxiosInstance, data: { decisionKey: string; variables: Record<string, any> }) =>
  axios.post<DecisionResult>('/api/workflow/decision/evaluate', { decisionDefinitionKey: data.decisionKey, variables: data.variables, tenantId: 'default' });