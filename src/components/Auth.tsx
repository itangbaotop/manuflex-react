import React from 'react';
import { useAuth } from '../context/AuthContext';

interface AuthProps {
  children: React.ReactNode;
  permission?: string;       // 需要的权限 (e.g., 'user:create')
  roles?: string[];          // 需要的角色之一 (e.g., ['ROLE_ADMIN'])
  fallback?: React.ReactNode;// (可选) 没权限时显示的内容，默认不显示
}

/**
 * 权限控制组件
 * 用法: 
 * <Auth permission="user:create"><Button>Add</Button></Auth>
 * <Auth roles={['ROLE_ADMIN']} fallback={<span>无权查看</span>}>...</Auth>
 */
export const Auth: React.FC<AuthProps> = ({ children, permission, roles, fallback = null }) => {
  const { hasPermission, hasAnyRole } = useAuth();

  // 1. 检查权限 (Permission)
  if (permission && !hasPermission(permission)) {
    return <>{fallback}</>;
  }

  // 2. 检查角色 (Role)
  if (roles && !hasAnyRole(roles)) {
    return <>{fallback}</>;
  }

  // 3. 通过检查，渲染子组件
  return <>{children}</>;
};