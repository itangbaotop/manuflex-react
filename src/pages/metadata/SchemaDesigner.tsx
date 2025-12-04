import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Table, Button, Drawer, Form, Input, Select, Switch, message, Space, Popconfirm, Tag, Alert } from 'antd';
import { ArrowLeftOutlined, PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useAuth } from '../../context/AuthContext';
import { getSchemaByName, createField, updateField, deleteField, getSchemas } from '../../api/metadata';
import type { MetadataSchema, MetadataField } from '../../api/metadata';

const { Option } = Select;

const SchemaDesigner: React.FC = () => {
  const { schemaName } = useParams<{ schemaName: string }>();
  const { getAuthenticatedAxios, user } = useAuth();
  const navigate = useNavigate();
  const [allSchemas, setAllSchemas] = useState<MetadataSchema[]>([]);
  const [relatedFields, setRelatedFields] = useState<MetadataField[]>([]);

  const [schema, setSchema] = useState<MetadataSchema | null>(null);
  const [loading, setLoading] = useState(false);
  
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [editingField, setEditingField] = useState<MetadataField | null>(null);
  const [fieldForm] = Form.useForm();

  const fetchSchema = async () => {
    if (!user?.tenantId || !schemaName) return;
    setLoading(true);
    try {
      const data = await getSchemaByName(getAuthenticatedAxios(), user.tenantId, schemaName);
      setSchema(data);
    } catch (err) {
      message.error('加载模型详情失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchema();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schemaName]);

  useEffect(() => {
      if (user?.tenantId) {
          getSchemas(getAuthenticatedAxios(), user.tenantId).then(setAllSchemas);
      }
  }, [user]);

  // 处理保存字段
  const handleSaveField = async () => {
    if (!schema) return; // 保护检查

    try {
        const values = await fieldForm.validateFields();
        const axios = getAuthenticatedAxios();
        
        if (editingField?.id) {
            await updateField(axios, schema.id, editingField.id, values);
            message.success('字段更新成功');
        } else {
            await createField(axios, schema.id, values);
            message.success('字段创建成功');
        }
        
        setDrawerVisible(false);
        fieldForm.resetFields();
        setEditingField(null);
        fetchSchema(); 
    } catch (e) {
        message.error('保存失败');
    }
  };

  // 处理删除字段
  const handleDeleteField = async (id: number) => {
      if (!schema) return; // 保护检查

      try {
          await deleteField(getAuthenticatedAxios(), schema.id, id);
          message.success('已删除');
          fetchSchema();
      } catch(e) {
          message.error('删除失败');
      }
  };

  const handleRelatedSchemaChange = async (targetSchemaName: string) => {
      if (!user?.tenantId || !targetSchemaName) return;
      try {
          const targetSchema = await getSchemaByName(getAuthenticatedAxios(), user.tenantId, targetSchemaName);
          setRelatedFields(targetSchema.fields || []);
          // 清空已选的显示字段
          fieldForm.setFieldsValue({ relatedFieldName: undefined });
      } catch (e) {
          message.error("无法加载目标模型字段");
      }
  };

  const columns = [
    { title: '字段标识 (Column)', dataIndex: 'fieldName', key: 'fieldName', render: (text: string) => <b>{text}</b> },
    { title: '显示名称', dataIndex: 'description', key: 'description' },
    { title: '类型', dataIndex: 'fieldType', key: 'fieldType', render: (text: string) => <Tag color="geekblue">{text}</Tag> },
    { title: '必填', dataIndex: 'required', key: 'required', render: (val: boolean) => val ? <Tag color="red">是</Tag> : <span style={{color:'#ccc'}}>否</span> },
    {
        title: '操作',
        key: 'action',
        render: (_: any, record: MetadataField) => (
            <Space>
                <Button type="link" size="small" icon={<EditOutlined/>} onClick={() => {
                    setEditingField(record);
                    fieldForm.setFieldsValue(record);
                    setDrawerVisible(true);
                }}>编辑</Button>
                <Popconfirm title="确定删除此字段?" onConfirm={() => handleDeleteField(record.id!)}>
                    <Button type="link" size="small" danger icon={<DeleteOutlined/>}>删除</Button>
                </Popconfirm>
            </Space>
        )
    }
  ];

  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/system/metadata')}>
              返回列表
          </Button>
          <Alert type="info" message="修改字段后，请记得在列表页点击【发布】以同步数据库结构。" showIcon style={{marginLeft: 16, flex: 1}} />
      </div>
      
      <Card title={`设计模型: ${schema?.description || ''} (${schema?.name || ''})`} extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => {
              setEditingField(null);
              fieldForm.resetFields();
              setDrawerVisible(true);
          }}>添加字段</Button>
      }>
          <Table 
            rowKey="id" 
            dataSource={schema?.fields} 
            columns={columns} 
            loading={loading} 
            pagination={false}
          />
      </Card>

      <Drawer
        title={editingField ? "编辑字段" : "新建字段"}
        width={500}
        onClose={() => setDrawerVisible(false)}
        open={drawerVisible}
        extra={
          <Space>
            <Button onClick={() => setDrawerVisible(false)}>取消</Button>
            <Button type="primary" onClick={handleSaveField}>保存</Button>
          </Space>
        }
      >
        <Form form={fieldForm} layout="vertical">
            <Form.Item name="fieldName" label="字段标识 (key)" rules={[{ required: true }, {pattern: /^[a-zA-Z0-9_]+$/, message: '只能含字母数字下划线'}]} help="数据库列名，如 price">
                <Input placeholder="e.g. price" disabled={!!editingField} />
            </Form.Item>
            <Form.Item name="description" label="显示名称" rules={[{ required: true }]}>
                <Input placeholder="e.g. 价格" />
            </Form.Item>
            <Form.Item name="fieldType" label="数据类型" rules={[{ required: true }]}>
                <Select disabled={!!editingField}>
                    <Option value="STRING">文本 (String)</Option>
                    <Option value="TEXT">长文本 (Text)</Option>
                    <Option value="INTEGER">整数 (Integer)</Option>
                    <Option value="NUMBER">小数 (Number)</Option>
                    <Option value="BOOLEAN">布尔 (Yes/No)</Option>
                    <Option value="DATE">日期 (Date)</Option>
                    <Option value="DATETIME">日期时间 (DateTime)</Option>
                    <Option value="ENUM">枚举 (Enum)</Option>
                    <Option value="REFERENCE">引用 (Reference)</Option>
                </Select>
            </Form.Item>
            
            <Form.Item
                noStyle
                shouldUpdate={(prev, current) => prev.fieldType !== current.fieldType}
            >
                {({ getFieldValue }) => 
                    getFieldValue('fieldType') === 'REFERENCE' ? (
                        <div style={{background: '#f5f5f5', padding: 12, borderRadius: 4, marginBottom: 16}}>
                            <Form.Item 
                                name="relatedSchemaName" 
                                label="关联目标模型" 
                                rules={[{ required: true, message: '请选择关联模型' }]}
                            >
                                <Select 
                                    placeholder="选择要引用的表 (如 Car)" 
                                    onChange={handleRelatedSchemaChange}
                                    showSearch
                                >
                                    {allSchemas.map(s => (
                                        <Option key={s.id} value={s.name}>{s.description} ({s.name})</Option>
                                    ))}
                                </Select>
                            </Form.Item>
                            
                            <Form.Item 
                                name="relatedFieldName" 
                                label="显示字段" 
                                rules={[{ required: true, message: '请选择显示字段' }]}
                                help="在下拉框中显示哪个字段的值 (如 brand)"
                            >
                                <Select placeholder="选择显示的列">
                                    {relatedFields.map(f => (
                                        <Option key={f.fieldName} value={f.fieldName}>{f.description} ({f.fieldName})</Option>
                                    ))}
                                </Select>
                            </Form.Item>
                        </div>
                    ) : null
                }
            </Form.Item>
            
            <Form.Item
                noStyle
                shouldUpdate={(prev, current) => prev.fieldType !== current.fieldType}
            >
                {({ getFieldValue }) => 
                    getFieldValue('fieldType') === 'ENUM' ? (
                        <Form.Item 
                            name="options" 
                            label="枚举选项 (JSON Array)" 
                            rules={[{ required: true }]}
                            help='例如: ["选项A", "选项B"]'
                        >
                            <Input.TextArea rows={2} />
                        </Form.Item>
                    ) : null
                }
            </Form.Item>

            <Form.Item name="required" valuePropName="checked" label="是否必填">
                <Switch />
            </Form.Item>
            
            <Form.Item name="defaultValue" label="默认值">
                <Input />
            </Form.Item>
        </Form>
      </Drawer>
    </div>
  );
};

export default SchemaDesigner;