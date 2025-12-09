import React, { useEffect, useState } from 'react';
import { Table, Button, Modal, Form, Input, message, Popconfirm, Space, Card, Tag, Tooltip, Switch, Divider } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, ToolOutlined, SyncOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getSchemas, createSchema, deleteSchema, updateSchema, syncDatabaseTable } from '../../api/metadata';
import type { MetadataSchema } from '../../api/metadata';

const SchemaListPage: React.FC = () => {
  const { getAuthenticatedAxios, user } = useAuth();
  const [schemas, setSchemas] = useState<MetadataSchema[]>([]);
  const [loading, setLoading] = useState(false);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSchema, setEditingSchema] = useState<MetadataSchema | null>(null);
  const [form] = Form.useForm();
  
  const navigate = useNavigate();

  const fetchSchemas = async () => {
    if (!user?.tenantId) return;
    setLoading(true);
    try {
      const data = await getSchemas(getAuthenticatedAxios(), user.tenantId);
      setSchemas(data);
    } catch (err) {
      message.error('加载模型列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchemas();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      const axios = getAuthenticatedAxios();
      
      if (editingSchema) {
          await updateSchema(axios, editingSchema.id, values);
          message.success('更新成功');
      } else {
          await createSchema(axios, {
              ...values,
              tenantId: user?.tenantId
          });
          message.success('创建成功');
      }
      
      setIsModalOpen(false);
      form.resetFields();
      fetchSchemas();
    } catch (err) {
      message.error('操作失败');
    }
  };

  const handleDelete = async (id: number) => {
      try {
          await deleteSchema(getAuthenticatedAxios(), id);
          message.success('模型已删除');
          fetchSchemas();
      } catch (e) {
          message.error('删除失败，请确保该模型下没有数据');
      }
  };

  // 🔥 关键功能：发布模型（创建物理表）
  const handleSyncDb = async (id: number) => {
      try {
          await syncDatabaseTable(getAuthenticatedAxios(), id);
          message.success('数据库表同步成功！现在可以去录入数据了。');
      } catch (e) {
          message.error('同步失败，请检查后端日志');
      }
  };

  const columns = [
    { title: '模型标识 (Table)', dataIndex: 'name', key: 'name', render: (t:string) => <b>{t}</b> },
    { title: '显示名称', dataIndex: 'description', key: 'description' },
    { 
        title: '字段数', 
        key: 'fieldCount', 
        render: (_:any, record: MetadataSchema) => <Tag color="geekblue">{record.fields?.length || 0}</Tag>
    },
    {
      title: '操作',
      key: 'action',
      width: 300,
      render: (_: any, record: MetadataSchema) => (
        <Space>
          <Tooltip title="进入设计器，添加/修改字段">
            <Button 
                type="primary" 
                ghost 
                size="small"
                icon={<ToolOutlined />} 
                onClick={() => navigate(`/system/metadata/design/${record.name}`)}
            >
                设计
            </Button>
          </Tooltip>

          <Tooltip title="将模型结构同步到数据库 (Create/Alter Table)">
            <Button 
                type="default" 
                size="small"
                icon={<SyncOutlined />} 
                onClick={() => handleSyncDb(record.id)}
            >
                发布
            </Button>
          </Tooltip>

          <Button 
            type="text" 
            size="small" 
            icon={<EditOutlined />} 
            onClick={() => {
                setEditingSchema(record);
                form.setFieldsValue({
                  name: record.name,
                  description: record.description,
                  workflowEnabled: record.workflowEnabled || false,
                  workflowProcessKey: record.workflowProcessKey || '',
                  workflowFormKey: record.workflowFormKey || ''
                });
                setIsModalOpen(true);
            }} 
          />
          
          <Popconfirm title="确定删除? 此操作不可恢复!" onConfirm={() => handleDelete(record.id)}>
            <Button danger type="text" size="small" icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Card title="业务模型管理" extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => {
              setEditingSchema(null);
              form.resetFields();
              setIsModalOpen(true);
          }}>
            新建模型
          </Button>
      }>
        <Table rowKey="id" dataSource={schemas} columns={columns} loading={loading} />
      </Card>

      <Modal 
        title={editingSchema ? "编辑模型信息" : "新建业务模型"} 
        open={isModalOpen} 
        onOk={handleSave} 
        onCancel={() => setIsModalOpen(false)}
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item 
            name="name" 
            label="模型标识 (英文)" 
            rules={[{ required: true }, { pattern: /^[a-zA-Z][a-zA-Z0-9_]*$/, message: '只能包含字母、数字和下划线' }]}
            help="将作为数据库表名的一部分，例如: Car -> d_001_Car"
          >
            <Input placeholder="例如: Car" disabled={!!editingSchema} />
          </Form.Item>
          <Form.Item name="description" label="显示名称" rules={[{ required: true }]}>
            <Input placeholder="例如: 车辆管理" />
          </Form.Item>
          
          <Divider orientation="left">流程配置</Divider>
          
          <Form.Item name="workflowEnabled" label="启用流程" valuePropName="checked">
            <Switch />
          </Form.Item>
          
          <Form.Item
            noStyle
            shouldUpdate={(prev, current) => prev.workflowEnabled !== current.workflowEnabled}
          >
            {({ getFieldValue }) => 
              getFieldValue('workflowEnabled') ? (
                <>
                  <Form.Item name="workflowProcessKey" label="关联流程" help="输入流程定义Key">
                    <Input placeholder="例如: leave_approval_process" />
                  </Form.Item>
                  <Form.Item name="workflowFormKey" label="关联表单" help="输入表单Key">
                    <Input placeholder="例如: leave_application_form" />
                  </Form.Item>
                </>
              ) : null
            }
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default SchemaListPage;