import React, { useEffect, useState, useCallback } from 'react';
import { Table, Button, Modal, Form, Input, message, Popconfirm, Space, Card } from 'antd';
import { PlusOutlined, DeleteOutlined, ToolOutlined, EditOutlined } from '@ant-design/icons'; // 引入 EditOutlined 用于编辑
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getSchemas, createSchema, deleteSchema, updateSchema } from '../../api/metadata'; // 导入 MetadataSchemaDTO 和更新函数
import type { MetadataSchemaDTO, MetadataSchemaCreateRequest, MetadataSchemaUpdateRequest } from '../../api/metadata';

const SchemaListPage: React.FC = () => {
  const { getAuthenticatedAxios, user, hasPermission } = useAuth(); // 引入 hasPermission
  const [schemas, setSchemas] = useState<MetadataSchemaDTO[]>([]); // 使用 MetadataSchemaDTO 类型
  const [loading, setLoading] = useState(false);

  // 模态框状态
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSchema, setEditingSchema] = useState<MetadataSchemaDTO | null>(null); // 编辑中的 Schema
  const [form] = Form.useForm();
  const navigate = useNavigate();

  const fetchSchemas = useCallback(async () => {
    if (!user?.tenantId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const authAxios = getAuthenticatedAxios();
      const data = await getSchemas(authAxios, user.tenantId);
      setSchemas(data);
    } catch (err) {
      console.error('加载模型列表失败', err);
      message.error('加载模型列表失败');
    } finally {
      setLoading(false);
    }
  }, [getAuthenticatedAxios, user?.tenantId]);

  useEffect(() => {
    fetchSchemas();
  }, [fetchSchemas]);

  const handleCreateOrUpdate = async () => {
    setLoading(true);
    try {
      const values = await form.validateFields();
      const authAxios = getAuthenticatedAxios();

      if (editingSchema) {
        // 编辑模式
        const updateData: MetadataSchemaUpdateRequest = {
          id: editingSchema.id,
          name: values.name,
          description: values.description,
        };
        await updateSchema(authAxios, editingSchema.id, updateData);
        message.success('模型更新成功');
      } else {
        // 创建模式
        const createData: MetadataSchemaCreateRequest = {
          name: values.name,
          description: values.description,
        };
        await createSchema(authAxios, createData);
        message.success('模型创建成功');
      }

      setIsModalOpen(false);
      form.resetFields();
      setEditingSchema(null); // 清除编辑状态
      fetchSchemas();
      // 建议刷新页面以更新左侧菜单，或通过 Context 机制更新
      message.info('请刷新页面以查看左侧菜单变化');
    } catch (err: any) {
      console.error('保存模型失败', err);
      const msg = err.response?.data?.message || '保存失败';
      message.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => { // ID 类型为 string
      setLoading(true);
      try {
          await deleteSchema(getAuthenticatedAxios(), id);
          message.success('模型已删除');
          fetchSchemas();
          message.info('请刷新页面以查看左侧菜单变化');
      } catch (e) {
          console.error('删除模型失败', e);
          message.error('删除失败，请确保该模型下没有数据');
      } finally {
        setLoading(false);
      }
  };

  const columns = [
    { title: '模型名称 (英文)', dataIndex: 'name', key: 'name' },
    { title: '描述 (中文)', dataIndex: 'description', key: 'description' },
    {
        title: '字段数',
        key: 'fieldCount',
        render: (_:any, record: MetadataSchemaDTO) => record.fields?.length || 0 // 使用 MetadataSchemaDTO
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: MetadataSchemaDTO) => ( // 使用 MetadataSchemaDTO
        <Space>
          {hasPermission('schema:design') && ( // 权限控制
            <Button
              type="primary"
              ghost
              icon={<ToolOutlined />}
              onClick={() => navigate(`/system/metadata/design/${record.name}`)}
            >
              设计字段
            </Button>
          )}
          {hasPermission('schema:write') && ( // 权限控制
            <Button
              type="link"
              icon={<EditOutlined />}
              onClick={() => {
                setEditingSchema(record);
                form.setFieldsValue(record);
                setIsModalOpen(true);
              }}
            >
              编辑
            </Button>
          )}
          {hasPermission('schema:delete') && ( // 权限控制
            <Popconfirm title="确定删除此模型吗？这将删除所有相关数据！" onConfirm={() => handleDelete(record.id)}>
              <Button danger icon={<DeleteOutlined />} />
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Card title="业务模型管理" extra={
          hasPermission('schema:create') && ( // 权限控制
            <Button type="primary" icon={<PlusOutlined />} onClick={() => {
                setEditingSchema(null); // 清除编辑状态
                form.resetFields();
                setIsModalOpen(true);
            }}>
              新建模型
            </Button>
          )
      } loading={loading}>
        <Table rowKey="id" dataSource={schemas} columns={columns} loading={loading} />
      </Card>

      <Modal
        title={editingSchema ? "编辑业务模型" : "新建业务模型"}
        open={isModalOpen}
        onOk={handleCreateOrUpdate}
        onCancel={() => { setIsModalOpen(false); form.resetFields(); setEditingSchema(null); }}
        confirmLoading={loading}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="模型标识 (英文)"
            rules={[
                { required: true, message: '请输入模型标识' },
                { pattern: /^[a-zA-Z][a-zA-Z0-9_]*$/, message: '只能以字母开头，包含字母、数字和下划线' }
            ]}
            help="用于数据库表名和API路径，例如: Customer, Order"
          >
            <Input placeholder="例如: Equipment" disabled={!!editingSchema} /> {/* 编辑时模型标识不可修改 */}
          </Form.Item>
          <Form.Item name="description" label="显示名称" rules={[{ required: true, message: '请输入显示名称' }]}>
            <Input placeholder="例如: 设备管理" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default SchemaListPage;
