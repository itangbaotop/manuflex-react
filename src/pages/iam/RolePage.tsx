import React, { useEffect, useState, useCallback } from 'react';
import { Table, Button, Modal, Form, Input, message, Transfer, Card, Tag, Space, Popconfirm } from 'antd';
import { PlusOutlined, DeleteOutlined, SafetyCertificateOutlined, EditOutlined } from '@ant-design/icons';
import { useAuth } from '../../context/AuthContext';
import { useIamApi } from '../../api/iam'; // 导入新的 API 和 DTO 类型
import type { RoleDTO, PermissionDTO, RoleCreateRequest, RoleUpdateRequest } from '../../api/iam';

const RolePage: React.FC = () => {
  const { getAuthenticatedAxios, hasPermission } = useAuth();
  const { getRoles, createRole, deleteRole, updateRolePermissions, getAllPermissions, updateRole } = useIamApi(); // 使用 useIamApi
  const [roles, setRoles] = useState<RoleDTO[]>([]); // 使用 RoleDTO 类型
  const [allPermissions, setAllPermissions] = useState<PermissionDTO[]>([]); // 存储所有权限
  const [loading, setLoading] = useState(false);

  // 角色创建/编辑 Modal
  const [isEditCreateModalOpen, setIsEditCreateModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<RoleDTO | null>(null); // 使用 RoleDTO 类型
  const [editCreateForm] = Form.useForm();

  // 权限分配 Modal
  const [isPermModalOpen, setIsPermModalOpen] = useState(false);
  const [currentRoleForPerms, setCurrentRoleForPerms] = useState<RoleDTO | null>(null); // 使用 RoleDTO 类型
  const [targetPermissionKeys, setTargetPermissionKeys] = useState<string[]>([]); // 已选权限的 code 列表

  // 获取角色列表
  const fetchRoles = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getRoles();
      setRoles(data);
    } catch (err) {
      console.error('加载角色失败', err);
      message.error('加载角色失败');
    } finally {
      setLoading(false);
    }
  }, [getRoles]);

  // 获取所有权限列表
  const fetchAllPermissions = useCallback(async () => {
    try {
      const data = await getAllPermissions();
      setAllPermissions(data);
    } catch (err) {
      console.error('加载所有权限失败', err);
      message.error('加载所有权限失败');
    }
  }, [getAllPermissions]);

  useEffect(() => {
    fetchRoles();
    fetchAllPermissions();
  }, [fetchRoles, fetchAllPermissions]);

  // 处理角色创建/编辑
  const handleEditCreate = async () => {
    try {
      const values = await editCreateForm.validateFields();
      if (editingRole) {
        // 编辑角色
        const updateData: RoleUpdateRequest = {
          id: editingRole.id,
          name: values.name,
          description: values.description,
        };
        await updateRole(editingRole.id, updateData); // 调用 updateRole
        message.success('角色更新成功');
      } else {
        // 创建角色
        const createData: RoleCreateRequest = {
          name: values.name,
          description: values.description,
        };
        await createRole(createData); // 调用 createRole
        message.success('角色创建成功');
      }
      setIsEditCreateModalOpen(false);
      editCreateForm.resetFields();
      fetchRoles(); // 刷新角色列表
    } catch (e) {
      console.error('保存角色失败', e);
      message.error('保存失败');
    }
  };

  // 处理角色删除
  const handleDelete = async (id: string) => { // ID 类型为 string
    try {
      await deleteRole(id); // 调用 deleteRole
      message.success('角色已删除');
      fetchRoles();
    } catch (e) {
      console.error('删除角色失败', e);
      message.error('删除失败');
    }
  };

  // 打开权限配置窗口
  const openPermModal = (role: RoleDTO) => {
    setCurrentRoleForPerms(role);
    // 从角色自带的 permissions 中提取 code 作为已选权限
    setTargetPermissionKeys(role.permissions.map(p => p.code));
    setIsPermModalOpen(true);
  };

  // 保存权限分配
  const handleSavePerms = async () => {
    if (!currentRoleForPerms) return;
    try {
      await updateRolePermissions(currentRoleForPerms.id, targetPermissionKeys); // 调用 updateRolePermissions
      message.success('权限更新成功');
      setIsPermModalOpen(false);
      fetchRoles(); // 刷新以获取最新权限
    } catch (e) {
      console.error('更新权限失败', e);
      message.error('更新权限失败');
    }
  };

  const columns = [
    { title: '角色名称', dataIndex: 'name', key: 'name', render: (t: string) => <Tag color="blue">{t}</Tag> },
    { title: '描述', dataIndex: 'description', key: 'description' },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: RoleDTO) => ( // 使用 RoleDTO 类型
        <Space>
          {hasPermission('role:write') && ( // 权限控制
            <Button type="link" icon={<SafetyCertificateOutlined />} onClick={() => openPermModal(record)}>
                配置权限
            </Button>
          )}
          {hasPermission('role:write') && ( // 权限控制
            <Button type="link" icon={<EditOutlined />} onClick={() => {
                setEditingRole(record);
                editCreateForm.setFieldsValue(record);
                setIsEditCreateModalOpen(true);
            }}>编辑</Button>
          )}
          {hasPermission('role:delete') && ( // 权限控制
            <Popconfirm title="确认删除?" onConfirm={() => handleDelete(record.id)}>
                <Button type="link" danger icon={<DeleteOutlined />}>删除
                </Button>
            </Popconfirm>
          )}
        </Space>
      )
    },
  ];

  // 转换所有权限为 Transfer 组件所需的格式
  const transferDataSource = allPermissions.map(p => ({
    key: p.code,
    title: `${p.name} (${p.code})`,
    description: p.description,
  }));

  return (
    <div style={{ padding: 24 }}>
        <Card title="角色与权限管理" extra={
            hasPermission('role:write') && ( // 权限控制
                <Button type="primary" icon={<PlusOutlined />} onClick={() => {
                    setEditingRole(null);
                    editCreateForm.resetFields();
                    setIsEditCreateModalOpen(true);
                }}>新建角色</Button>
            )
        }>
            <Table
                rowKey="id"
                dataSource={roles}
                columns={columns}
                loading={loading}
                pagination={false} // 如果后端支持分页，这里可以配置
            />
        </Card>

        {/* 创建/编辑角色弹窗 */}
        <Modal
            title={editingRole ? "编辑角色" : "新建角色"}
            open={isEditCreateModalOpen}
            onOk={handleEditCreate}
            onCancel={() => setIsEditCreateModalOpen(false)}
            confirmLoading={loading}
        >
            <Form form={editCreateForm} layout="vertical">
                <Form.Item name="name" label="角色标识 (ROLE_开头)" rules={[{ required: true, pattern: /^ROLE_[A-Z_]+$/, message: '必须以 ROLE_ 开头，大写字母和下划线' }]}>
                    <Input placeholder="例如: ROLE_LIMS_MANAGER" />
                </Form.Item>
                <Form.Item name="description" label="描述" rules={[{ required: true, message: '请输入角色描述' }]}>
                    <Input placeholder="例如: LIMS 实验室经理" />
                </Form.Item>
            </Form>
        </Modal>

        {/* 分配权限弹窗 */}
        <Modal
            title={`分配权限 - ${currentRoleForPerms?.description || ''}`}
            open={isPermModalOpen}
            onOk={handleSavePerms}
            onCancel={() => setIsPermModalOpen(false)}
            confirmLoading={loading}
            width={700}
        >
            <Transfer
                dataSource={transferDataSource}
                titles={['未分配', '已分配']}
                targetKeys={targetPermissionKeys}
                onChange={(nextTargetKeys) => setTargetPermissionKeys(nextTargetKeys as string[])}
                render={item => item.title}
                listStyle={{ width: 300, height: 300 }}
            />
        </Modal>
    </div>
  );
};

export default RolePage;