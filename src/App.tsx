import { Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import MainLayout from './components/MainLayout';
import UserPage from './pages/iam/UserPage';
import DynamicCRUDPage from './pages/DynamicCRUDPage';
import SchemaListPage from './pages/metadata/SchemaListPage';
import { useAuth } from './context/AuthContext';
import { Spin, Layout } from 'antd'; // 导入 Spin 和 Layout

function App() {
  // 从 AuthContext 获取 isAuthenticated 和 loading 状态
  const { isAuthenticated, loading: authLoading } = useAuth();

  // 如果认证信息还在加载中，显示一个全局加载指示器
  if (authLoading) {
    return (
      <Layout style={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <Spin size="large" tip="认证信息加载中..." />
      </Layout>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      {/* 所有受保护的页面都包裹在 MainLayout 中
          只有当 isAuthenticated 为 true 时才渲染 MainLayout，否则重定向到登录页
      */}
      <Route path="/" element={isAuthenticated ? <MainLayout /> : <Navigate to="/login" replace />}>
        {/* 默认跳转到仪表盘 */}
        <Route index element={<Navigate to="/dashboard" replace />} />

        <Route path="dashboard" element={<DashboardPage />} />

        {/* 系统管理路由 */}
        <Route path="system/users" element={<UserPage />} />
        <Route path="system/metadata" element={<SchemaListPage />} />

        {/* 动态业务路由：万能路由，匹配所有 /app/data/xxx */}
        <Route path="app/data/:schemaName" element={<DynamicCRUDPage />} />
      </Route>
    </Routes>
  );
}

export default App;
