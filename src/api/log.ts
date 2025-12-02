import type { AxiosInstance } from 'axios';

export interface OperationLog {
    id: number;
    module: string;
    action: string;
    description: string;
    username: string;
    userIp: string;
    status: string;
    errorMsg?: string;
    executionTime: number;
    createdAt: string;
}

export interface LogSearchParams {
    username?: string;
    module?: string;
    status?: string;
    page: number;
    size: number;
}

export const getOperationLogs = async (axios: AxiosInstance, params: LogSearchParams) => {
    const response = await axios.get('/api/iam/logs', { params });
    return response.data;
};