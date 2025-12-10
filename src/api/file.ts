import type { AxiosInstance } from 'axios';

export interface FileResponse {
  fileName: string;
  objectName: string;
  url: string;
  contentType: string;
  size: number;
}

export interface KnowledgeDocument {
  id: number;
  title: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  fileUrl: string;
  category: string;
  chunkCount: number;
  vectorStatus: string;
  tenantId: string;
  createdBy: string;
  createdAt: string;
}

export interface QueryRequest {
  question: string;
  tenantId: string;
}

export interface QueryResponse {
  answer: string;
}

// 上传文件
export const uploadFile = async (axios: AxiosInstance, file: File): Promise<FileResponse> => {
  const formData = new FormData();
  formData.append('file', file);

  // 注意：Content-Type 会由浏览器自动设置为 multipart/form-data
  const response = await axios.post('/api/file/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
  return response.data;
};

// 知识库相关API

// 上传知识库文档
export const uploadKnowledgeDocument = async (
  axios: AxiosInstance, 
  file: File, 
  tenantId: string, 
  category: string = '其他'
): Promise<KnowledgeDocument> => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('tenantId', tenantId);
  formData.append('category', category);

  const response = await axios.post('/api/file/knowledge/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return response.data;
};

// 获取知识库文档列表
export const getKnowledgeDocuments = async (
  axios: AxiosInstance, 
  tenantId: string
): Promise<KnowledgeDocument[]> => {
  const response = await axios.get(`/api/file/knowledge/documents?tenantId=${tenantId}`);
  return response.data;
};

// 删除知识库文档
export const deleteKnowledgeDocument = async (
  axios: AxiosInstance, 
  id: number
): Promise<void> => {
  await axios.delete(`/api/file/knowledge/documents/${id}`);
};

// AI问答查询
export const queryKnowledge = async (
  axios: AxiosInstance, 
  question: string, 
  tenantId: string
): Promise<string> => {
  const response = await axios.post('/api/file/knowledge/query', {
    question,
    tenantId
  });
  return response.data.answer;
};