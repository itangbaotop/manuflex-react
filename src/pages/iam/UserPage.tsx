import React, { useEffect, useState, useCallback } from 'react';
import { Table, Button, Modal, Form, Input, message, Tag, Popconfirm, Space, Select, Switch, TreeSelect } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, UserOutlined, KeyOutlined } from '@ant-design/icons';
import { useAuth } from '../../context/AuthContext';
import { getUsers, getRoles, createUser, updateUser, deleteUser, resetPassword } from '../../api/iam';
import type { User, Role } from '../../api/iam';
import { getDepartmentTree } from '../../api/department';
import type { Department } from '../../api/department';
import { Tooltip } from 'antd/lib';
import { Auth } from '../../components/Auth';

const UserPage: React.FC = () => {
  const { getAuthenticatedAxios, user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(false);
  const [deptTree, setDeptTree] = useState<Department[]>([]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [form] = Form.useForm();

  const [isResetPwdModalOpen, setIsResetPwdModalOpen] = useState(false);
  const [resetPwdUserId, setResetPwdUserId] = useState<number | null>(null);
  const [pwdForm] = Form.useForm();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const axios = getAuthenticatedAxios();
      const [userData, roleData, deptData] = await Promise.all([getUsers(axios), getRoles(axios), getDepartmentTree(axios)]);
      setUsers(userData);
      setRoles(roleData);
      setDeptTree(deptData);
    } catch (err) {
      console.error(err);
      message.error('数据加载失败');
    } finally {
      setLoading(false);
    }
  }, [getAuthenticatedAxios]);

  const handleResetPassword = async () => {
      if (!resetPwdUserId) return;
      try {
          const values = await pwdForm.validateFields();
          await resetPassword(getAuthenticatedAxios(), resetPwdUserId, values.password);
          message.success('密码重置成功');
          setIsResetPwdModalOpen(false);
          pwdForm.resetFields();
          setResetPwdUserId(null);
      } catch (e) {
          message.error('重置失败');
      }
  };

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // 转换部门树给 TreeSelect 用
  const formatDeptTree = (items: Department[]): any[] => {
      return items.map(item => ({
          title: item.name,
          value: item.id,
          key: item.id,
          children: item.children ? formatDeptTree(item.children) : []
      }));
  };

  const openModal = (user?: User) => {
      setEditingUser(user || null);
      if (user) {
          // 编辑模式
          // 后端返回的 User.roles 可能是对象数组 [{id:1, name:'ADMIN'}] 也可能是字符串数组 ['ADMIN']
          // 我们统一提取 name 作为 form 的 value
          const roleNames = user.roles.map((r: any) => (typeof r === 'object' ? r.name : r));
          
          form.setFieldsValue({
              ...user,
              roles: roleNames,
              deptId: user.deptId
          });
      } else {
          // 新建模式
          form.resetFields();
          form.setFieldsValue({ enabled: true });
      }
      setIsModalOpen(true);
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const values = await form.validateFields();
      const axios = getAuthenticatedAxios();

      if (editingUser) {
          await updateUser(axios, editingUser.id, {
              email: values.email,
              enabled: values.enabled,
              roles: values.roles, // 传给后端的是角色名列表 ['ROLE_ADMIN']
              deptId: values.deptId
          });
          message.success('用户更新成功');
      } else {
          await createUser(axios, {
            username: values.username,
            email: values.email,
            password: values.password,
            roles: values.roles, 
            deptId: values.deptId,
            tenantId: currentUser?.tenantId || 'default'
          });
          message.success('用户创建成功');
      }

      setIsModalOpen(false);
      fetchData();
    } catch (err: any) {
      console.error(err);
      const msg = err.response?.data?.message || '操作失败';
      message.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteUser(getAuthenticatedAxios(), id);
      message.success('用户已删除');
      fetchData();
    } catch (err) {
      message.error('删除失败');
    }
  };

  const columns = [
    { title: '用户名', dataIndex: 'username', key: 'username', render: (t:string) => <b><UserOutlined style={{marginRight:6}}/>{t}</b> },
    { title: '部门', dataIndex: 'deptName', key: 'deptName', render: (t:string) => t || '-' },
    { title: '邮箱', dataIndex: 'email', key: 'email' },
    {
      title: '状态',
      dataIndex: 'enabled',
      key: 'enabled',
      render: (enabled: boolean) => (
          <Tag color={enabled ? 'green' : 'red'}>
              {enabled ? '启用' : '禁用'}
          </Tag>
      ),
    },
    {
      title: '角色',
      dataIndex: 'roles',
      key: 'roles',
      render: (userRoles: any[]) => {
        if (!userRoles || userRoles.length === 0) return <span style={{color:'#ccc'}}>无角色</span>;
        return (
          <Space size={[0, 8]} wrap>
            {userRoles.map((r: any, idx: number) => {
                const roleName = typeof r === 'object' ? r.name : r;
                // 特殊颜色处理
                const color = roleName === 'ROLE_ADMIN' ? 'gold' : 'geekblue';
                return <Tag key={idx} color={color}>{roleName}</Tag>;
            })}
          </Space>
        );
      }
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: User) => (
        <Space>
            <Auth permission="user:create">
                <Button type="link" icon={<EditOutlined />} onClick={() => openModal(record)}>编辑</Button>
            </Auth>
            
            <Tooltip title="重置密码">
                <Button type="link" size="small" icon={<KeyOutlined />} onClick={() => {
                    setResetPwdUserId(record.id);
                    setIsResetPwdModalOpen(true);
                }}>重置</Button>
            </Tooltip>
            
            {/* 保护自己不被删除 */}
            {record.username !== currentUser?.username && (
                <Popconfirm title="确定删除?" onConfirm={() => handleDelete(record.id)}>
                  <Button danger type="link" size="small" icon={<DeleteOutlined />}>删除</Button>
                </Popconfirm>
            )}
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 16 }}>
        <Auth permission="user:create">
          <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal()}>添加用户</Button>
        </Auth>
      </div>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={users}
        loading={loading}
        pagination={{ pageSize: 10 }}
      />

      <Modal
        title={editingUser ? "编辑用户" : "新建用户"}
        open={isModalOpen}
        onOk={handleSave}
        onCancel={() => setIsModalOpen(false)}
        confirmLoading={loading}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="username" label="用户名" rules={[{ required: !editingUser, message: '必填' }]}>
            <Input disabled={!!editingUser} placeholder="登录账号" />
          </Form.Item>

          <Form.Item name="deptId" label="所属部门">
              <TreeSelect
                  treeData={formatDeptTree(deptTree)}
                  placeholder="选择部门"
                  treeDefaultExpandAll
                  allowClear
              />
          </Form.Item>

          <Form.Item name="email" label="邮箱" rules={[{ required: true, type: 'email' }]}>
            <Input placeholder="用于找回密码" />
          </Form.Item>

          {!editingUser && (
              <Form.Item name="password" label="初始密码" rules={[{ required: true, min: 6 }]}>
                <Input.Password placeholder="至少6位" />
              </Form.Item>
          )}

          {editingUser && (
              <Form.Item name="enabled" label="账号状态" valuePropName="checked">
                  <Switch checkedChildren="启用" unCheckedChildren="禁用" />
              </Form.Item>
          )}

          <Form.Item name="roles" label="分配角色">
              <Select
                mode="multiple"
                placeholder="请选择角色"
                // 使用 options 属性优化性能和显示
                options={roles.map(role => ({
                    label: `${role.description} (${role.name})`,
                    value: role.name // 绑定角色名
                }))}
                filterOption={(input, option) => 
                    ((option?.label as string) || '').toLowerCase().includes(input.toLowerCase())
                }
              />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="重置密码"
        open={isResetPwdModalOpen}
        onOk={handleResetPassword}
        onCancel={() => { setIsResetPwdModalOpen(false); pwdForm.resetFields(); }}
        width={400}
      >
          <Form form={pwdForm} layout="vertical">
              <Form.Item 
                name="password" 
                label="新密码" 
                rules={[{ required: true, min: 6, message: '至少6位' }]}
              >
                  <Input.Password placeholder="请输入新密码" />
              </Form.Item>
          </Form>
      </Modal>
    </div>
  );
};

export default UserPage;