import type { AxiosInstance } from 'axios';

export interface FileResponse {
  fileName: string;
  objectName: string;
  url: string;
  contentType: string;
  size: number;
}

// 上传文件
export const uploadFile = async (axios: AxiosInstance, file: File): Promise<FileResponse> => {
  const formData = new FormData();
  formData.append('file', file);

  // 注意：Content-Type 会由浏览器自动设置为 multipart/form-data
  const response = await axios.post('/api/file/upload', formData);
  return response.data;
};