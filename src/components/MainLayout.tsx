import React, { useState, useEffect } from 'react';
import { Layout, Menu, Button, theme, Dropdown, Space, Avatar, Spin } from 'antd';
import * as AntdIcons from '@ant-design/icons';
import { useNavigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getCurrentUserMenus} from '../api/menu';
import type { Menu as MenuEntity  } from '../api/menu';
import { getSchemas } from '../api/metadata';

const { Header, Sider, Content } = Layout;

// 动态图标渲染
const renderIcon = (iconName?: string) => {
    if (!iconName) return null;
    const IconComp = (AntdIcons as any)[iconName];
    return IconComp ? <IconComp /> : null;
};

// 递归转换菜单数据
const transformMenuData = (menus: MenuEntity[]): any[] => {
    return menus.map(menu => {
        const item: any = {
            key: menu.path || `dir-${menu.id}`, // 目录没有path，用id防重复
            icon: renderIcon(menu.icon),
            label: menu.name,
        };
        // 只有当 children 存在且长度大于 0 时，才添加 children 属性
        // Antd Menu 会根据是否存在 children 来决定渲染成 SubMenu 还是 Item
        if (menu.children && menu.children.length > 0) {
            item.children = transformMenuData(menu.children);
        }
        return item;
    });
};

const MainLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [loadingMenus, setLoadingMenus] = useState(false);
  // 用来强制刷新 Menu 组件的状态
  const [menuKey, setMenuKey] = useState(0);
  
  const { token: { colorBgContainer } } = theme.useToken();
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, user, getAuthenticatedAxios } = useAuth();

  const handleMenuClick = (e: any) => {
    // 只有以 / 开头的 key 才是路由路径
    if (e.key.startsWith('/')) {
        navigate(e.key);
    }
  };

  useEffect(() => {
    const loadMenus = async () => {
        if (!user?.tenantId) return;
        setLoadingMenus(true);
        const axios = getAuthenticatedAxios();
        
        let systemMenus: MenuEntity[] = [];
        let appMenuChildren: any[] = [];

        // 1. 加载系统菜单 (独立 try-catch，防止一个挂了全挂)
        try {
            systemMenus = await getCurrentUserMenus(axios);
            console.log("✅ 系统菜单加载成功:", systemMenus);
        } catch (e) {
            console.error("❌ 系统菜单加载失败:", e);
        }

        // 2. 加载业务模型 (独立 try-catch)
        try {
            const schemas = await getSchemas(axios, user.tenantId);
            appMenuChildren = schemas.map((schema: any) => ({
                key: `/app/data/${schema.name}`,
                label: schema.description || schema.name,
                icon: <AntdIcons.TableOutlined />
            }));
        } catch (e) {
            console.error("⚠️ 业务模型加载失败 (可能是服务未启动):", e);
        }

        // 3. 组装
        const antdSystemMenus = transformMenuData(systemMenus);
        
        const finalMenus = [...antdSystemMenus];
        // 只有当有业务模型时才添加 "业务应用" 目录
        if (appMenuChildren.length > 0) {
            finalMenus.push({
                key: 'apps',
                icon: <AntdIcons.DatabaseOutlined />,
                label: '业务应用',
                children: appMenuChildren
            });
        }

        setMenuItems(finalMenus);
        setMenuKey(prev => prev + 1);
        
        setLoadingMenus(false);
    };

    loadMenus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const userMenuItems = [
    {
      key: 'logout',
      icon: <AntdIcons.LogoutOutlined />,
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
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'white', fontSize: 18, fontWeight: 'bold', background: '#002140'
        }}>
           {collapsed ? 'MF' : 'ManuFlex'}
        </div>
        
        <Spin spinning={loadingMenus} tip="Loading...">
            <Menu
                key={menuKey} 
                theme="dark"
                mode="inline"
                selectedKeys={[location.pathname]}
                // 默认展开所有一级菜单
                defaultOpenKeys={menuItems.map(m => m.key)}
                items={menuItems}
                onClick={handleMenuClick}
            />
        </Spin>
      </Sider>
      
      <Layout>
        <Header style={{ padding: '0 24px', background: colorBgContainer, display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 1px 4px rgba(0,21,41,0.08)' }}>
          <Button
            type="text"
            icon={collapsed ? <AntdIcons.MenuUnfoldOutlined /> : <AntdIcons.MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            style={{ fontSize: '16px', width: 64, height: 64 }}
          />
          
          <Dropdown menu={{ items: userMenuItems }}>
            <Space style={{ cursor: 'pointer', padding: '0 12px', borderRadius: 6, transition: 'all 0.3s' }} className="user-dropdown">
              <Avatar style={{ backgroundColor: '#1890ff' }} icon={<AntdIcons.UserOutlined />} />
              <span style={{ fontSize: 14 }}>{user?.username}</span>
              <AntdIcons.DownOutlined style={{ fontSize: 12, color: '#999' }} />
            </Space>
          </Dropdown>
        </Header>
        
        <Content style={{ margin: '24px 16px', padding: 24, minHeight: 280, background: colorBgContainer, borderRadius: 8, overflow: 'auto' }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};

export default MainLayout;