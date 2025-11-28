import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import MainLayout from './components/MainLayout';
import UserPage from './pages/iam/UserPage';
import DynamicCRUDPage from './pages/DynamicCRUDPage'; // 确保你之前已经创建了这个文件
import { useAuth } from './context/AuthContext';

function App() {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      
      {/* 所有受保护的页面都包裹在 MainLayout 中 
          Outlet 会在 MainLayout 的 Content 区域渲染子路由
      */}
      <Route path="/" element={isAuthenticated ? <MainLayout /> : <Navigate to="/login" replace />}>
        {/* 默认跳转 */}
        <Route index element={<Navigate to="/dashboard" replace />} />
        
        <Route path="dashboard" element={<DashboardPage />} />
        
        {/* 系统管理路由 */}
        <Route path="system/users" element={<UserPage />} />

        {/* 动态业务路由：万能路由，匹配所有 /app/data/xxx */}
        <Route path="app/data/:schemaName" element={<DynamicCRUDPage />} />
      </Route>
    </Routes>
  );
}

export default App;