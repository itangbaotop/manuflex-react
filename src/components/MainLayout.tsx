import React, { useState } from 'react';
import { Layout, Menu, Button, theme, Dropdown, Space } from 'antd';
import { 
  UserOutlined, 
  DatabaseOutlined, 
  LogoutOutlined, 
  MenuUnfoldOutlined,
  MenuFoldOutlined,
  AppstoreOutlined,
  DownOutlined
} from '@ant-design/icons';
import { useNavigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const { Header, Sider, Content } = Layout;

const MainLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const { token: { colorBgContainer } } = theme.useToken();
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, user } = useAuth();

  // 处理菜单点击跳转
  const handleMenuClick = (e: any) => {
    navigate(e.key);
  };

  // 侧边栏菜单配置
  const menuItems = [
    {
      key: '/dashboard',
      icon: <AppstoreOutlined />,
      label: 'Dashboard',
    },
    // 系统管理模块：通常只有 ADMIN 或 TENANT_ADMIN 可见
    {
      key: 'system',
      icon: <UserOutlined />,
      label: 'System Management',
      children: [
        { key: '/system/users', label: 'Users' },
        // { key: '/system/roles', label: 'Roles' }, // 后续实现
      ]
    },
    // 业务应用模块：未来这里将根据 Metadata 动态生成
    {
      key: 'apps',
      icon: <DatabaseOutlined />,
      label: 'Business Apps',
      children: [
        // 示例：直接链接到通用的动态数据页
        { key: '/app/data/LimsSample', label: 'LIMS Samples' }, 
      ]
    },
  ];

  // 顶部用户下拉菜单
  const userMenuItems = [
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Logout',
      danger: true,
      onClick: () => {
        logout();
        navigate('/login');
      }
    }
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider trigger={null} collapsible collapsed={collapsed}>
        <div style={{ 
          height: 32, 
          margin: 16, 
          background: 'rgba(255, 255, 255, 0.2)', 
          textAlign: 'center', 
          color: 'white', 
          lineHeight: '32px',
          fontWeight: 'bold',
          letterSpacing: '1px'
        }}>
           {collapsed ? 'MF' : 'ManuFlex PaaS'}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          defaultSelectedKeys={[location.pathname]}
          defaultOpenKeys={['system', 'apps']} // 默认展开
          items={menuItems}
          onClick={handleMenuClick}
        />
      </Sider>
      <Layout>
        <Header style={{ padding: '0 24px', background: colorBgContainer, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            style={{ fontSize: '16px', width: 64, height: 64 }}
          />
          
          <Dropdown menu={{ items: userMenuItems }}>
            <Space style={{ cursor: 'pointer' }}>
              <span>Welcome, <b>{user?.username}</b></span>
              <DownOutlined />
            </Space>
          </Dropdown>
        </Header>
        <Content style={{ margin: '24px 16px', padding: 24, background: colorBgContainer, overflow: 'auto' }}>
          {/* 子路由将在这里渲染 */}
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};

export default MainLayout;