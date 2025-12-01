import React, { useState, useEffect, useCallback } from 'react';
import { Layout, Menu, Button, theme, Dropdown, Space, Avatar, Spin, message } from 'antd';
import {
  UserOutlined,
  MenuUnfoldOutlined,
  MenuFoldOutlined,
  LogoutOutlined,
  DownOutlined,
  DatabaseOutlined,
  TableOutlined,
  FileOutlined
} from '@ant-design/icons';
import { useNavigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getMenus } from '../api/menu';
import type { MenuDTO } from '../api/menu';
import { getSchemas } from '../api/metadata';
import type { MetadataSchemaDTO } from '../api/metadata';
import * as AntdIcons from '@ant-design/icons';

const { Header, Sider, Content } = Layout;

const renderIcon = (iconName?: string) => {
    if (!iconName) return null;
    const IconComp = (AntdIcons as any)[iconName];
    return IconComp ? <IconComp /> : <FileOutlined />;
};

const transformMenuData = (menus: MenuDTO[]): any[] => {
    return menus
      .sort((a, b) => a.orderNum - b.orderNum)
      .map(menu => {
        const item: any = {
            key: menu.path || `menu_${menu.id}`,
            icon: renderIcon(menu.icon),
            label: menu.name,
        };
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
  const [openKeys, setOpenKeys] = useState<string[]>([]);
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);

  const { token: { colorBgContainer } } = theme.useToken();
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, user, getAuthenticatedAxios, isAuthenticated, loading: authLoading } = useAuth();

  // 处理菜单点击
  const handleMenuClick = (e: any) => {
    if (e.key.startsWith('/')) {
        navigate(e.key);
    }
    setSelectedKeys([e.key]);
  };

  // 处理 SubMenu 展开/折叠
  const onOpenChange = (keys: string[]) => {
    setOpenKeys(keys);
  };

  // 监听路由变化，更新选中和展开的菜单项
  useEffect(() => {
    const currentPath = location.pathname;
    setSelectedKeys([currentPath]);

    // 递归查找所有父级菜单的 key，用于展开 SubMenu
    const getAllParentKeys = (items: any[], path: string, parents: string[] = []): string[] => {
      for (const item of items) {
        if (item.key === path) {
          return parents;
        }
        if (item.children && item.children.length > 0) {
          const childParents = getAllParentKeys(item.children, path, [...parents, item.key]);
          if (childParents.length > 0) {
            return childParents;
          }
        }
      }
      return [];
    };

    if (menuItems.length > 0) {
        const parentsToOpen = getAllParentKeys(menuItems, currentPath);
        // 合并当前已展开的菜单和需要展开的父级菜单，并去重
        setOpenKeys(prev => Array.from(new Set([...prev, ...parentsToOpen])));
    }

  }, [location.pathname, menuItems]); // 依赖 location.pathname 和 menuItems

  // 加载菜单
  const loadMenus = useCallback(async () => {
      console.log("MainLayout: 开始加载菜单...");
      if (authLoading) {
          console.log("MainLayout: AuthContext 仍在加载中，跳过菜单加载。");
          return;
      }
      if (!isAuthenticated) {
          console.log("MainLayout: 用户未认证，跳过菜单加载。");
          setMenuItems([]);
          return;
      }
      if (!user?.tenantId) {
          console.log("MainLayout: 用户 tenantId 缺失，无法加载业务菜单。");
      }

      setLoadingMenus(true);
      try {
          const axios = getAuthenticatedAxios();

          console.log("MainLayout: 尝试获取系统菜单...");
          const systemMenus = await getMenus(axios);
          console.log("MainLayout: 获取到的系统菜单原始数据:", systemMenus);
          const antdSystemMenus = transformMenuData(systemMenus);
          console.log("MainLayout: 转换后的 Antd 系统菜单:", antdSystemMenus);

          let appMenu: any = null;
          if (user?.tenantId) {
              console.log("MainLayout: 尝试获取业务模型 (tenantId:", user.tenantId, ")...");
              const schemas = await getSchemas(axios, user.tenantId);
              console.log("MainLayout: 获取到的 Schema 原始数据:", schemas);

              if (schemas && schemas.length > 0) {
                  appMenu = {
                      key: 'apps',
                      icon: <DatabaseOutlined />,
                      label: '业务应用',
                      children: schemas.map((schema: MetadataSchemaDTO) => ({
                          key: `/app/data/${schema.name}`,
                          label: schema.description || schema.name,
                          icon: <TableOutlined />
                      }))
                  };
                  console.log("MainLayout: 构建的业务应用菜单:", appMenu);
              } else {
                  console.log("MainLayout: 未获取到任何业务模型。");
              }
          } else {
              console.log("MainLayout: 用户 tenantId 缺失，跳过业务应用菜单构建。");
          }

          const finalMenus = appMenu ? [...antdSystemMenus, appMenu] : antdSystemMenus;
          setMenuItems(finalMenus);
          console.log("MainLayout: 最终菜单项:", finalMenus);

      } catch (e: any) {
          console.error("MainLayout: 加载菜单失败:", e);
          message.error(`加载菜单失败: ${e.message || '未知错误'}`);
          setMenuItems([]);
      } finally {
          setLoadingMenus(false);
          console.log("MainLayout: 菜单加载完成。");
      }
  }, [authLoading, isAuthenticated, user?.tenantId, getAuthenticatedAxios, getMenus, getSchemas]);

  useEffect(() => {
    loadMenus();
  }, [loadMenus]);

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

  if (authLoading) {
    return (
      <Layout style={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <Spin size="large" tip="认证信息加载中..." />
      </Layout>
    );
  }

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

        <Spin spinning={loadingMenus} tip="菜单加载中...">
            <Menu
                theme="dark"
                mode="inline"
                selectedKeys={selectedKeys}
                openKeys={openKeys} // 使用状态管理的展开项
                onOpenChange={onOpenChange} // 处理展开/折叠事件
                items={menuItems}
                onClick={handleMenuClick}
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
              <span style={{ fontSize: 14 }}>{user?.username || '访客'}</span>
              <DownOutlined style={{ fontSize: 12, color: '#999' }} />
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
