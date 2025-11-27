import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom'; // 导入 Routes, Route, Navigate
import LoginPage from './pages/LoginPage'; // 导入登录页面 (稍后创建)
import DashboardPage from './pages/DashboardPage'; // 导入仪表盘页面 (稍后创建)
import LimsSamplesPage from './pages/LimsSamplesPage'; // 导入 LIMS 样品页面 (稍后创建)
import WorkflowTasksPage from './pages/WorkflowTasksPage'; // 导入工作流任务页面 (稍后创建)
import { useAuth } from './context/AuthContext'; // 导入认证上下文

function App() {
  const { isAuthenticated } = useAuth(); // 获取认证状态

  return (
    <div className="App">
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        {/* 受保护的路由 */}
        <Route
          path="/dashboard"
          element={isAuthenticated ? <DashboardPage /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/lims-samples"
          element={isAuthenticated ? <LimsSamplesPage /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/workflow-tasks"
          element={isAuthenticated ? <WorkflowTasksPage /> : <Navigate to="/login" replace />}
        />
        {/* 默认跳转到仪表盘或登录页 */}
        <Route
          path="/"
          element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />}
        />
      </Routes>
    </div>
  );
}

export default App;
