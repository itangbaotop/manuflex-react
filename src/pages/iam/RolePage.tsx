import React, { useEffect, useState } from 'react';
import { Table, Button, Modal, Form, Input, message, Transfer, Tag, Space, Popconfirm, Card, Select } from 'antd';
import { PlusOutlined, DeleteOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import { useAuth } from '../../context/AuthContext';
import { getRoles, createRole, deleteRole, updateRolePermissions, getAllPermissions } from '../../api/iam';
import type { Role, Permission } from '../../api/iam';


const DATA_SCOPE_OPTIONS = [
    { label: '全部数据', value: 'ALL' },
    { label: '本部门及以下', value: 'DEPT_AND_CHILD' },
    { label: '本部门数据', value: 'DEPT' },
    { label: '仅本人数据', value: 'SELF' },
];

const RolePage: React.FC = () => {
  const { getAuthenticatedAxios } = useAuth();
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(false);
  
  // 角色创建 Modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createForm] = Form.useForm();

  // 权限分配 Modal
  const [isPermModalOpen, setIsPermModalOpen] = useState(false);
  const [currentRole, setCurrentRole] = useState<Role | null>(null);
  
  const [allPermissions, setAllPermissions] = useState<Permission[]>([]);
  const [targetKeys, setTargetKeys] = useState<string[]>([]); 

  const fetchRoles = async () => {
    setLoading(true);
    try {
      const data = await getRoles(getAuthenticatedAxios());
      setRoles(data);
    } catch (err) {
      message.error('加载角色失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoles();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreate = async () => {
    try {
        const values = await createForm.validateFields();
        await createRole(getAuthenticatedAxios(), values);
        message.success('角色创建成功');
        setIsCreateModalOpen(false);
        createForm.resetFields();
        fetchRoles();
    } catch (e) {
        message.error('创建失败');
    }
  };

  const handleDelete = async (id: number) => {
      try {
          await deleteRole(getAuthenticatedAxios(), id);
          message.success('角色已删除');
          fetchRoles();
      } catch (e) {
          message.error('删除失败');
      }
  };

  const openPermModal = async (role: Role) => {
      setCurrentRole(role);
      try {
          const axios = getAuthenticatedAxios();
          const perms = await getAllPermissions(axios);
          setAllPermissions(perms);

          // 回显已有的权限
          const existingIds = role.permissions 
              ? role.permissions.map((p: any) => String(p.id)) 
              : [];
          
          setTargetKeys(existingIds);
          setIsPermModalOpen(true);
      } catch (e) {
          console.error(e);
          message.error('加载权限数据失败');
      }
  };

  const handleSavePerms = async () => {
      if (!currentRole) return;
      try {
          const permissionIds = targetKeys.map(key => Number(key));
          await updateRolePermissions(getAuthenticatedAxios(), currentRole.id, permissionIds);
          
          message.success('权限更新成功');
          setIsPermModalOpen(false);
          fetchRoles(); 
      } catch (e) {
          message.error('更新权限失败');
      }
  };

  const columns = [
    { title: '角色名称', dataIndex: 'name', key: 'name', render: (t: string) => <Tag color="blue">{t}</Tag> },
    { title: '描述', dataIndex: 'description', key: 'description' },
    { 
        title: '数据范围', 
        dataIndex: 'dataScope', 
        key: 'dataScope',
        render: (val: string) => {
            const opt = DATA_SCOPE_OPTIONS.find(o => o.value === val);
            return opt ? <Tag color="cyan">{opt.label}</Tag> : val;
        }
    },
    { 
        title: '操作', 
        key: 'action',
        render: (_: any, record: Role) => (
            <Space>
                <Button type="link" icon={<SafetyCertificateOutlined />} onClick={() => openPermModal(record)}>
                    配置权限
                </Button>
                <Popconfirm title="确认删除?" onConfirm={() => handleDelete(record.id)}>
                    <Button type="link" danger icon={<DeleteOutlined />}>删除</Button>
                </Popconfirm>
            </Space>
        )
    },
  ];

  return (
    <div style={{ padding: 24 }}>
        <Card title="角色与权限管理" extra={
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsCreateModalOpen(true)}>新建角色</Button>
        }>
            <Table rowKey="id" dataSource={roles} columns={columns} loading={loading} />
        </Card>

        <Modal title="新建角色" open={isCreateModalOpen} onOk={handleCreate} onCancel={() => setIsCreateModalOpen(false)}>
            <Form form={createForm} layout="vertical">
                <Form.Item name="name" label="角色标识" rules={[{ required: true, pattern: /^ROLE_[A-Z_]+$/, message: '必须以 ROLE_ 开头' }]}>
                    <Input placeholder="例如: ROLE_LIMS_MANAGER" />
                </Form.Item>
                <Form.Item name="description" label="描述" rules={[{ required: true }]}>
                    <Input placeholder="例如: LIMS 实验室经理" />
                </Form.Item>
                <Form.Item name="dataScope" label="数据权限范围" rules={[{ required: true }]}>
                    <Select options={DATA_SCOPE_OPTIONS} />
                </Form.Item>
            </Form>
        </Modal>

        <Modal 
            title={`分配权限 - ${currentRole?.description}`} 
            open={isPermModalOpen} 
            onOk={handleSavePerms} 
            onCancel={() => setIsPermModalOpen(false)}
            width={700}
        >
            <Transfer
                dataSource={allPermissions}
                titles={['未分配', '已分配']}
                targetKeys={targetKeys}
                onChange={(nextTargetKeys) => setTargetKeys(nextTargetKeys as string[])}
                rowKey={record => String(record.id)} 
                render={item => `${item.name} (${item.code})`}
                listStyle={{ width: 300, height: 350 }}
                showSearch
                filterOption={(inputValue, item) =>
                    item.name.indexOf(inputValue) > -1 || item.code.indexOf(inputValue) > -1
                }
            />
        </Modal>
    </div>
  );
};

export default RolePage;