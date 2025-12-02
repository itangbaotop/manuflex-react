import React, { lazy } from 'react';

// 🔥 核心魔法：Vite 提供的 glob 导入
// 这会自动扫描 ../pages 目录下所有的 .tsx 文件
// eager: false (默认) 表示懒加载，只有用到时才加载 js 文件，优化性能
const modules = import.meta.glob('../pages/**/*.tsx');

/**
 * 根据数据库配置的路径加载组件
 * @param componentPath 数据库里存的字符串，例如 "iam/UserPage" 或 "DashboardPage"
 */
export const getComponentByPath = (componentPath: string) => {
    if (!componentPath) return null;

    // 1. 尝试拼接完整路径
    // 假设数据库存的是 "iam/UserPage"，我们要把它转成 "../pages/iam/UserPage.tsx"
    const filePath = `../pages/${componentPath}.tsx`;
    
    // 2. 在扫描到的模块列表中查找
    const importer = modules[filePath];

    if (!importer) {
        console.warn(`Component not found: ${filePath}`);
        // 返回一个 404 组件
        return () => <div style={{padding: 24, color: 'red'}}>Error: Component "{componentPath}" file not found.</div>;
    }

    // 3. 使用 React.lazy 动态加载
    // 这里需要断言 importer 的类型
    return lazy(importer as any);
};

/**
 * 获取所有可用的组件路径列表 (用于在菜单管理页面做下拉选择)
 * 返回格式示例: ["DashboardPage", "iam/UserPage", "iam/RolePage"]
 */
export const getAvailableComponentPaths = () => {
    return Object.keys(modules).map(path => {
        // 将 "../pages/iam/UserPage.tsx" 转换为 "iam/UserPage"
        return path.replace('../pages/', '').replace('.tsx', '');
    });
};