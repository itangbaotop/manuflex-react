import type { AxiosInstance } from 'axios';

export const MenuType = {
    DIRECTORY: 0, // 目录
    MENU: 1,      // 菜单
    BUTTON: 2     // 按钮
} as const;

// 提取值的类型：0 | 1 | 2
export type MenuType = typeof MenuType[keyof typeof MenuType];
export interface Menu {
    id: number;
    parentId: number;
    name: string;
    path?: string;
    component?: string; // 组件路径
    icon?: string;
    permission?: string;
    sortOrder: number;
    type: MenuType;     
    children?: Menu[];
}

export const getCurrentUserMenus = async (axios: AxiosInstance): Promise<Menu[]> => {
    const response = await axios.get('/api/iam/menus/current');
    return response.data;
};

export const getAllMenus = async (axios: AxiosInstance): Promise<Menu[]> => {
    const response = await axios.get('/api/iam/menus'); // 获取扁平列表，用于管理
    return response.data;
};

export const createMenu = (axios: AxiosInstance, data: any) => axios.post('/api/iam/menus', data);
export const updateMenu = (axios: AxiosInstance, id: number, data: any) => axios.put(`/api/iam/menus/${id}`, data);
export const deleteMenu = (axios: AxiosInstance, id: number) => axios.delete(`/api/iam/menus/${id}`);