import React, { useEffect, useState, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import MainLayout from './components/MainLayout';
import { useAuth } from './context/AuthContext';
import { getCurrentUserMenus } from './api/menu';
import type { Menu } from './api/menu';
import { getComponentByPath } from './config/componentMap'; // 引入新方法
import { Spin } from 'antd';
import SchemaDesigner from './pages/metadata/SchemaDesigner';

function App() {
  const { isAuthenticated, loading: authLoading, getAuthenticatedAxios } = useAuth();
  const [dynamicRoutes, setDynamicRoutes] = useState<any[]>([]);
  const [menuLoading, setMenuLoading] = useState(false);

  useEffect(() => {
    const loadRoutes = async () => {
        if (!isAuthenticated) return;
        setMenuLoading(true);
        try {
            const menus = await getCurrentUserMenus(getAuthenticatedAxios());
            const routes = flattenMenus(menus);
            setDynamicRoutes(routes);
        } catch (e) {
            console.error("加载路由失败", e);
        } finally {
            setMenuLoading(false);
        }
    };
    loadRoutes();
  }, [isAuthenticated, getAuthenticatedAxios]); // 添加依赖

  const flattenMenus = (menus: Menu[]): Menu[] => {
      let res: Menu[] = [];
      menus.forEach(m => {
          // 只有配置了 path 且配置了 component 的节点才生成路由
          if (m.component && m.path) {
              res.push(m);
          }
          if (m.children) {
              res = res.concat(flattenMenus(m.children));
          }
      });
      return res;
  };

  if (authLoading || (isAuthenticated && menuLoading)) {
      return <div style={{height: '100vh', display:'flex', justifyContent:'center', alignItems:'center'}}><Spin size="large"/></div>;
  }

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      
      <Route path="/" element={isAuthenticated ? <MainLayout /> : <Navigate to="/login" replace />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        
        {/* 动态路由生成 */}
        {dynamicRoutes.map(route => {
            // 🔥 这里根据路径动态加载组件
            const Component = getComponentByPath(route.component!);
            
            if (!Component) return null;

            return (
                <Route 
                    key={route.id} 
                    path={route.path?.replace(/^\//, '')} 
                    element={
                        // 🔥 必须包裹 Suspense 用于显示加载状态
                        <Suspense fallback={<Spin style={{margin: 20}} />}>
                            <Component />
                        </Suspense>
                    } 
                />
            );
        })}

        <Route path="system/metadata/design/:schemaName" element={<SchemaDesigner />} />

        <Route path="*" element={<div style={{padding: 24}}>404 Page Not Found</div>} />
      </Route>
    </Routes>
  );
}

export default App;