import type { AxiosInstance } from 'axios';

// =======================================================
// Menu 模块的 DTO 类型定义
// 这些应该与你的后端 IAM 服务中的菜单相关 DTO 保持一致
// =======================================================

export interface MenuDTO {
  id: string;
  parentId?: string;
  name: string;
  path: string; // 路由路径
  icon?: string; // Ant Design Icon Name (e.g., "UserOutlined")
  orderNum: number;
  type: 'MENU' | 'BUTTON'; // 菜单类型
  permissions?: string[]; // 访问该菜单所需的权限编码
  children?: MenuDTO[];
  // ... 其他菜单属性
}

// =======================================================
// Menu 模块的 API 调用函数
// =======================================================

/**
 * 获取当前用户的菜单列表 (通常是树形结构)
 * @param authAxios 经过认证的 Axios 实例
 * @returns Promise<MenuDTO[]>
 */
export const getMenus = async (authAxios: AxiosInstance): Promise<MenuDTO[]> => {
  const response = await authAxios.get('/api/iam/menus'); // 假设菜单 API 路径
  return response.data;
};

/**
 * 创建菜单
 * @param authAxios 经过认证的 Axios 实例
 * @param data 菜单创建请求体
 * @returns Promise<MenuDTO>
 */
export const createMenu = async (authAxios: AxiosInstance, data: Omit<MenuDTO, 'id' | 'children'>): Promise<MenuDTO> => {
  const response = await authAxios.post('/api/iam/menus', data);
  return response.data;
};

/**
 * 更新菜单
 * @param authAxios 经过认证的 Axios 实例
 * @param id 菜单 ID
 * @param data 菜单更新请求体
 * @returns Promise<MenuDTO>
 */
export const updateMenu = async (authAxios: AxiosInstance, id: string, data: Omit<MenuDTO, 'children'>): Promise<MenuDTO> => {
  const response = await authAxios.put(`/api/iam/menus/${id}`, data);
  return response.data;
};

/**
 * 删除菜单
 * @param authAxios 经过认证的 Axios 实例
 * @param id 菜单 ID
 * @returns Promise<void>
 */
export const deleteMenu = async (authAxios: AxiosInstance, id: string): Promise<void> => {
  await authAxios.delete(`/api/iam/menus/${id}`);
};
