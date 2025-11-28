import React, { useState, useEffect } from 'react';
import { Layout, Menu, Button, theme, Dropdown, Space, Avatar, Spin } from 'antd';
import { 
  UserOutlined, 
  SettingOutlined, 
  LogoutOutlined, 
  MenuUnfoldOutlined, 
  MenuFoldOutlined, 
  AppstoreOutlined,
  DatabaseOutlined,
  DownOutlined,
  TableOutlined
} from '@ant-design/icons';
import { useNavigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getSchemas } from '../api/metadata';
import type { MetadataSchema } from '../api/metadata';

const { Header, Sider, Content } = Layout;

// 定义菜单结构类型
interface MenuItem {
    key: string;
    icon?: React.ReactNode;
    label: React.ReactNode;
    children?: MenuItem[];
    permission?: string; // [新增] 需要的权限
    roles?: string[];    // [新增] 需要的角色
}

const MainLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [loadingSchemas, setLoadingSchemas] = useState(false);
  
  const { token: { colorBgContainer } } = theme.useToken();
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, user, getAuthenticatedAxios, hasPermission, hasAnyRole } = useAuth();

  // 1. 定义静态系统菜单
  const staticMenus: MenuItem[] = [
    {
      key: '/dashboard',
      icon: <AppstoreOutlined />,
      label: '仪表盘',
    },
    {
      key: 'system',
      icon: <SettingOutlined />,
      label: '系统管理',
      roles: ['ROLE_ADMIN', 'ROLE_TENANT_ADMIN'], // 只有管理员可见
      children: [
        { key: '/system/users', label: '用户管理', permission: 'user:read' },
        { key: '/system/roles', label: '角色权限', permission: 'role:read' },
      ]
    }
  ];

  // 2. 加载动态业务菜单 (Schema)
  useEffect(() => {
    const fetchDynamicMenus = async () => {
      if (!user?.tenantId) return;
      setLoadingSchemas(true);
      try {
        const axios = getAuthenticatedAxios();
        const schemas = await getSchemas(axios, user.tenantId);
        
        // 构建业务菜单部分
        const appMenu: MenuItem = {
            key: 'apps',
            icon: <DatabaseOutlined />,
            label: '业务应用',
            children: schemas.map((schema: MetadataSchema) => ({
                key: `/app/data/${schema.name}`, // 路由到通用 CRUD 页面
                label: schema.description || schema.name,
                icon: <TableOutlined />
            }))
        };
        
        // 合并菜单：静态 + 动态
        // 这里可以加入一个权限过滤函数
        const filteredStatic = filterMenus(staticMenus);
        setMenuItems([...filteredStatic, appMenu]);
        
      } catch (error) {
        console.error("Failed to load schemas", error);
        // 即使失败，也要显示静态菜单
        setMenuItems(filterMenus(staticMenus));
      } finally {
        setLoadingSchemas(false);
      }
    };

    fetchDynamicMenus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // 3. 递归过滤菜单的辅助函数
  const filterMenus = (items: MenuItem[]): any[] => {
      return items
        .filter(item => {
            // 检查角色
            if (item.roles && !hasAnyRole(item.roles)) return false;
            // 检查权限
            if (item.permission && !hasPermission(item.permission)) return false;
            return true;
        })
        .map(item => {
            if (item.children) {
                return { ...item, children: filterMenus(item.children) };
            }
            return item;
        });
  };

  const userMenuItems = [
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      danger: true,
      onClick: () => {
        logout();
        navigate('/login');
      }
    }
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider trigger={null} collapsible collapsed={collapsed} width={220}>
        <div style={{ 
          height: 64, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          color: 'white', 
          fontSize: 18,
          fontWeight: 'bold',
          background: '#002140'
        }}>
           {collapsed ? 'MF' : 'ManuFlex'}
        </div>
        
        <Spin spinning={loadingSchemas} tip="Loading Apps...">
            <Menu
            theme="dark"
            mode="inline"
            selectedKeys={[location.pathname]}
            // 默认展开所有以 'apps' 或 'system' 开头的菜单
            defaultOpenKeys={['apps', 'system']}
            items={menuItems}
            onClick={(e) => navigate(e.key)}
            />
        </Spin>
      </Sider>
      
      <Layout>
        <Header style={{ padding: '0 24px', background: colorBgContainer, display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 1px 4px rgba(0,21,41,0.08)' }}>
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            style={{ fontSize: '16px', width: 64, height: 64 }}
          />
          
          <Dropdown menu={{ items: userMenuItems }}>
            <Space style={{ cursor: 'pointer', padding: '0 12px', borderRadius: 6, transition: 'all 0.3s' }} className="user-dropdown">
              <Avatar style={{ backgroundColor: '#1890ff' }} icon={<UserOutlined />} />
              <span style={{ fontSize: 14 }}>{user?.username}</span>
              <DownOutlined style={{ fontSize: 12, color: '#999' }} />
            </Space>
          </Dropdown>
        </Header>
        
        <Content style={{ margin: '24px 16px', padding: 24, minHeight: 280, background: colorBgContainer, borderRadius: 8 }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};

export default MainLayout;