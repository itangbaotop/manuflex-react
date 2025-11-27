import { useAuth } from '../context/AuthContext';
import axios, { AxiosInstance } from 'axios'; // ⬅️ 导入 AxiosInstance

const API_BASE_URL = 'http://localhost:8080';

interface SampleResponse {
  id: number;
  sampleName: string;
  batchNumber: string;
  collectionDate: string;
  status: string;
  tenantId: string;
  createdAt: string;
  updatedAt: string;
  customFields: { [key: string]: any };
}

// ⬅️ 修改参数类型为 AxiosInstance
export const getLimsSamples = async (authenticatedAxios: AxiosInstance, tenantId: string): Promise<SampleResponse[]> => {
  const response = await authenticatedAxios.get(`${API_BASE_URL}/api/lims/${tenantId}/samples`);
  return response.data;
};

// ⬅️ 修改参数类型为 AxiosInstance
export const getLimsSampleById = async (authenticatedAxios: AxiosInstance, tenantId: string, sampleId: number): Promise<SampleResponse> => {
  const response = await authenticatedAxios.get(`${API_BASE_URL}/api/lims/${tenantId}/samples/${sampleId}`);
  return response.data;
};

