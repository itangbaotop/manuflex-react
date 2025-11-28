import React, { useEffect, useState } from 'react';
import { Table, Button, Modal, Form, Input, message, Tag, Popconfirm, Space } from 'antd';
import { useAuth } from '../../context/AuthContext';
import { getUsers, deleteUser, createUser } from '../../api/iam';
import type { User } from '../../api/iam';

const UserPage: React.FC = () => {
  const { getAuthenticatedAxios, user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form] = Form.useForm();

  // 加载用户列表
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const data = await getUsers(getAuthenticatedAxios());
      setUsers(data);
    } catch (err) {
      message.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // 处理创建用户提交
  const handleCreate = async () => {
    try {
      const values = await form.validateFields();
      // 自动填充当前管理员的 tenantId，确保租户隔离
      const payload = { 
        ...values, 
        tenantId: currentUser?.tenantId || 'default' 
      };
      
      await createUser(getAuthenticatedAxios(), payload);
      message.success('User created successfully');
      setIsModalOpen(false);
      form.resetFields();
      fetchUsers(); // 刷新列表
    } catch (err) {
      // 简单的错误处理，实际项目中可以解析 err.response.data 获取后端具体错误
      message.error('Failed to create user');
    }
  };

  // 处理删除用户
  const handleDelete = async (id: number) => {
    try {
      await deleteUser(getAuthenticatedAxios(), id);
      message.success('User deleted');
      fetchUsers();
    } catch (err) {
      message.error('Delete failed');
    }
  };

  const columns = [
    { title: 'ID', dataIndex: 'id', key: 'id', width: 80 },
    { title: 'Username', dataIndex: 'username', key: 'username' },
    { title: 'Email', dataIndex: 'email', key: 'email' },
    { title: 'Tenant ID', dataIndex: 'tenantId', key: 'tenantId' },
    { 
      title: 'Roles', 
      dataIndex: 'roles', 
      key: 'roles',
      render: (roles: string[]) => (
        <>
          {roles && roles.map(r => <Tag key={r} color="blue">{r}</Tag>)}
        </>
      )
    },
    {
      title: 'Created At',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (text: string) => new Date(text).toLocaleString()
    },
    {
      title: 'Action',
      key: 'action',
      render: (_: any, record: User) => (
        <Space size="middle">
           {/* 保护机制：不能删除自己 */}
           {currentUser && record.username !== currentUser.username && (
            <Popconfirm 
                title="Are you sure to delete this user?" 
                onConfirm={() => handleDelete(record.id)}
                okText="Yes"
                cancelText="No"
            >
              <Button danger type="link" style={{ padding: 0 }}>Delete</Button>
            </Popconfirm>
           )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0 }}>User Management</h2>
        <Button type="primary" onClick={() => setIsModalOpen(true)}>Add User</Button>
      </div>

      <Table 
        rowKey="id" 
        columns={columns} 
        dataSource={users} 
        loading={loading} 
        pagination={{ pageSize: 10 }}
      />

      <Modal 
        title="Create User" 
        open={isModalOpen} 
        onOk={handleCreate} 
        onCancel={() => setIsModalOpen(false)}
      >
        <Form form={form} layout="vertical">
          <Form.Item 
            name="username" 
            label="Username" 
            rules={[{ required: true, message: 'Please input username' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item 
            name="email" 
            label="Email" 
            rules={[{ required: true, type: 'email', message: 'Please input a valid email' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item 
            name="password" 
            label="Password" 
            rules={[{ required: true, min: 6, message: 'Password must be at least 6 characters' }]}
          >
            <Input.Password />
          </Form.Item>
          {/* 暂不提供角色选择，后端默认分配 USER 角色 */}
        </Form>
      </Modal>
    </div>
  );
};

export default UserPage;