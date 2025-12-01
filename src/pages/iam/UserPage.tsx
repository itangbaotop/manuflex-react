import React, { useEffect, useState, useCallback, useMemo } from 'react'; // 引入 useMemo
import { Table, Button, Modal, Form, Input, message, Tag, Popconfirm, Space, Select, Switch } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useAuth } from '../../context/AuthContext';
import { useIamApi } from '../../api/iam';
import type { UserDTO, RoleDTO, UserCreateRequest, UserUpdateRequest } from '../../api/iam';
import type { DefaultOptionType } from 'antd/es/select';

const { Option } = Select; // Option 将不再直接用于渲染，但保留以便兼容旧代码风格或作为参考

const UserPage: React.FC = () => {
  const { hasPermission } = useAuth();
  const { getUsers, getRoles, createUser, updateUser, deleteUser } = useIamApi();
  const [users, setUsers] = useState<UserDTO[]>([]);
  const [roles, setRoles] = useState<RoleDTO[]>([]); // 存储所有可选角色
  const [loading, setLoading] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserDTO | null>(null);
  const [form] = Form.useForm();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [userData, roleData] = await Promise.all([getUsers(), getRoles()]);
      console.log('UserPage: Fetched Users Data:', userData);
      console.log('UserPage: Fetched Roles Data (for Select options):', roleData);
      setUsers(userData);
      setRoles(roleData);
    } catch (err) {
      console.error('UserPage: 数据加载失败', err);
      message.error('数据加载失败');
    } finally {
      setLoading(false);
    }
  }, [getUsers, getRoles]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openModal = (user?: UserDTO) => {
      setEditingUser(user || null);
      if (user) {
          console.log('UserPage: Editing User Data:', user);
          console.log('UserPage: User Roles for Form (original):', user.roles);

          const roleIdsToSet = Array.isArray(user.roles)
            ? user.roles.map(r => r.id)
            : [];

          console.log('UserPage: Role IDs to set in form:', roleIdsToSet);

          form.setFieldsValue({
              ...user,
              roleIds: roleIdsToSet
          });
      } else {
          form.resetFields();
          form.setFieldsValue({ enabled: true });
      }
      setIsModalOpen(true);
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const values = await form.validateFields();
      if (editingUser) {
          const updateData: UserUpdateRequest = {
              id: editingUser.id,
              username: values.username,
              email: values.email,
              enabled: values.enabled,
              roleIds: values.roleIds
          };
          await updateUser(editingUser.id, updateData);
          message.success('用户更新成功');
      } else {
          const createData: UserCreateRequest = {
            username: values.username,
            email: values.email,
            password: values.password,
            roleIds: values.roleIds,
          };
          await createUser(createData);
          message.success('用户创建成功');
      }

      setIsModalOpen(false);
      fetchData();
    } catch (err: any) {
      console.error('UserPage: 操作失败', err);
      const msg = err.response?.data?.message || '操作失败';
      message.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    setLoading(true);
    try {
      await deleteUser(id);
      message.success('用户已删除');
      fetchData();
    } catch (err) {
      console.error('UserPage: 删除失败', err);
      message.error('删除失败');
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    { title: '用户名', dataIndex: 'username', key: 'username' },
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
      render: (userRoles: RoleDTO[]) => {
        console.log('UserPage: Rendering roles in table:', userRoles);
        if (!userRoles || !Array.isArray(userRoles) || userRoles.length === 0) {
            return '-';
        }
        return (
          <Space size={[0, 8]} wrap>
            {userRoles.map(r => (
                <Tag key={r.id} color="geekblue">{r.name} ({r.description})</Tag>
            ))}
          </Space>
        );
      }
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: UserDTO) => (
        <Space>
           {hasPermission('user:write') && (
            <Button type="link" icon={<EditOutlined />} onClick={() => openModal(record)}>编辑</Button>
           )}
           {hasPermission('user:delete') && (
            <Popconfirm title="确定删除?" onConfirm={() => handleDelete(record.id)}>
              <Button danger type="link" icon={<DeleteOutlined />}>删除</Button>
            </Popconfirm>
           )}
        </Space>
      ),
    },
  ];

  // 使用 useMemo 创建 roleOptions，确保在 roles 变化时才重新计算
  const roleOptions = useMemo(() => {
    return roles.map(role => ({
      label: `${role.name} (${role.description})`,
      value: role.id,
    }));
  }, [roles]);

  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <h2>用户管理</h2>
        {hasPermission('user:create') && (
            <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal()}>添加用户</Button>
        )}
      </div>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={users}
        loading={loading}
        pagination={{
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条`,
        }}
      />

      <Modal
        title={editingUser ? "编辑用户" : "新建用户"}
        open={isModalOpen}
        onOk={handleSave}
        onCancel={() => { setIsModalOpen(false); form.resetFields(); setEditingUser(null); }}
        confirmLoading={loading}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="username" label="用户名" rules={[{ required: !editingUser, message: '请输入用户名' }]}>
            <Input disabled={!!editingUser} />
          </Form.Item>

          <Form.Item name="email" label="邮箱" rules={[{ required: true, type: 'email', message: '请输入有效邮箱' }]}>
            <Input />
          </Form.Item>

          {!editingUser && (
              <Form.Item name="password" label="初始密码" rules={[{ required: true, min: 6, message: '密码至少6位' }]}>
                <Input.Password />
              </Form.Item>
          )}

          {editingUser && (
              <Form.Item name="enabled" label="启用状态" valuePropName="checked">
                  <Switch checkedChildren="启用" unCheckedChildren="禁用" />
              </Form.Item>
          )}

          <Form.Item name="roleIds" label="分配角色">
              <Select
                mode="multiple"
                placeholder="请选择角色"
                options={roleOptions}
                filterOption={(input, option?: DefaultOptionType) => {
                    const optionLabel = String(option?.label || '').toLowerCase();
                    return optionLabel.includes(input.toLowerCase());
                }}
              />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default UserPage;
