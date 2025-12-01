import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Table, Button, Drawer, Form, Input, Select, Switch, message, Space, Popconfirm, Tag, InputNumber } from 'antd';
import { ArrowLeftOutlined, PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useAuth } from '../../context/AuthContext';
import { getSchemas, getSchemaById, createField, updateField, deleteField } from '../../api/metadata';
import type { MetadataSchemaDTO, MetadataFieldDTO, MetadataFieldUpdateRequest, MetadataFieldCreateRequest } from '../../api/metadata';

const { Option } = Select;
const { TextArea } = Input;

const SchemaDesigner: React.FC = () => {
  const { schemaName } = useParams<{ schemaName: string }>();
  const { getAuthenticatedAxios, user } = useAuth();
  const navigate = useNavigate();

  const [schema, setSchema] = useState<MetadataSchemaDTO | null>(null);
  const [loading, setLoading] = useState(false);

  const [drawerVisible, setDrawerVisible] = useState(false);
  const [editingField, setEditingField] = useState<MetadataFieldDTO | null>(null);
  const [fieldForm] = Form.useForm();

  const fetchSchema = useCallback(async () => {
    if (!user?.tenantId || !schemaName) {
        setLoading(false);
        return;
    }
    setLoading(true);
    try {
      const authAxios = getAuthenticatedAxios();
      // 获取所有 schemas，然后根据 name 查找。
      // 更好的方案是后端提供 getSchemaByName 接口，或者路由使用 schemaId。
      const allSchemas = await getSchemas(authAxios, user.tenantId);
      const foundSchema = allSchemas.find(s => s.name === schemaName);

      if (foundSchema) {
        // 如果找到，我们还需要获取其详细字段，因为 getSchemas 返回的可能不包含 fields
        const detailedSchema = await getSchemaById(authAxios, foundSchema.id);
        setSchema(detailedSchema);
      } else {
        message.error(`未找到名为 "${schemaName}" 的模型`);
        setSchema(null);
      }
    } catch (err) {
      console.error('加载模型详情失败', err);
      message.error('加载模型详情失败');
    } finally {
      setLoading(false);
    }
  }, [getAuthenticatedAxios, schemaName, user?.tenantId]);

  useEffect(() => {
    fetchSchema();
  }, [fetchSchema]);

  const handleSaveField = async () => {
    setLoading(true);
    try {
        const values = await fieldForm.validateFields();
        const authAxios = getAuthenticatedAxios();

        let processedOptions: string[] | undefined;
        if (values.fieldType === 'ENUM' && values.options) {
            try {
                const parsedOptions = JSON.parse(values.options);
                if (Array.isArray(parsedOptions) && parsedOptions.every(item => typeof item === 'string')) {
                    processedOptions = parsedOptions;
                } else {
                    message.error('枚举选项必须是字符串数组的JSON格式，例如: ["A", "B", "C"]');
                    setLoading(false);
                    return;
                }
            } catch (e) {
                message.error('枚举选项格式不正确，请输入有效的JSON字符串数组');
                setLoading(false);
                return;
            }
        }

        if (editingField?.id) {
            const updateData: MetadataFieldUpdateRequest = {
                id: editingField.id,
                fieldName: values.fieldName,
                fieldType: values.fieldType,
                label: values.label,
                required: values.required,
                defaultValue: values.defaultValue,
                options: processedOptions,
                orderNum: values.orderNum,
            };
            await updateField(authAxios, editingField.id, updateData);
            message.success('字段更新成功');
        } else {
            if (!schema?.id) {
                message.error('无法创建字段：Schema ID 不可用');
                setLoading(false);
                return;
            }
            const createData: MetadataFieldCreateRequest = {
                schemaId: schema.id,
                fieldName: values.fieldName,
                fieldType: values.fieldType,
                label: values.label,
                required: values.required,
                defaultValue: values.defaultValue,
                options: processedOptions,
                orderNum: values.orderNum,
            };
            await createField(authAxios, createData);
            message.success('字段创建成功');
        }

        setDrawerVisible(false);
        fieldForm.resetFields();
        setEditingField(null);
        fetchSchema();
    } catch (e) {
        console.error('保存字段失败', e);
        message.error('保存失败');
    } finally {
        setLoading(false);
    }
  };

  const handleDeleteField = async (id: string) => {
      setLoading(true);
      try {
          await deleteField(getAuthenticatedAxios(), id);
          message.success('字段已删除');
          fetchSchema();
      } catch(e) {
          console.error('删除字段失败', e);
          message.error('删除失败');
      } finally {
        setLoading(false);
      }
  };

  const columns = [
    { title: '字段标识', dataIndex: 'fieldName', key: 'fieldName', render: (text: string) => <b>{text}</b> },
    { title: '显示名称', dataIndex: 'label', key: 'label' },
    { title: '类型', dataIndex: 'fieldType', key: 'fieldType', render: (text: string) => <Tag color="blue">{text}</Tag> },
    { title: '必填', dataIndex: 'required', key: 'required', render: (val: boolean) => val ? <Tag color="red">是</Tag> : '否' },
    { title: '排序', dataIndex: 'orderNum', key: 'orderNum' },
    {
        title: '操作',
        key: 'action',
        render: (_: any, record: MetadataFieldDTO) => (
            <Space>
                <Button type="link" icon={<EditOutlined />} onClick={() => {
                    setEditingField(record);
                    fieldForm.setFieldsValue({
                        ...record,
                        options: record.fieldType === 'ENUM' && Array.isArray(record.options)
                            ? JSON.stringify(record.options)
                            : record.options
                    });
                    setDrawerVisible(true);
                }}>编辑</Button>
                <Popconfirm title="确定删除此字段?" onConfirm={() => handleDeleteField(record.id)}>
                    <Button type="link" danger icon={<DeleteOutlined />}>删除</Button>
                </Popconfirm>
            </Space>
        )
    }
  ];

  return (
    <div style={{ padding: 24 }}>
      <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/system/metadata')} style={{ marginBottom: 16 }}>
          返回列表
      </Button>

      <Card title={`设计模型: ${schema?.description || ''} (${schema?.name || ''})`} extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => {
              setEditingField(null);
              fieldForm.resetFields();
              fieldForm.setFieldsValue({
                fieldType: 'STRING',
                required: false,
                orderNum: (schema?.fields?.length || 0) + 1,
              });
              setDrawerVisible(true);
          }}>添加字段</Button>
      } loading={loading}>
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
        onClose={() => { setDrawerVisible(false); fieldForm.resetFields(); setEditingField(null); }}
        open={drawerVisible}
        extra={
          <Space>
            <Button onClick={() => { setDrawerVisible(false); fieldForm.resetFields(); setEditingField(null); }}>取消</Button>
            <Button type="primary" onClick={handleSaveField} loading={loading}>保存</Button>
          </Space>
        }
      >
        <Form form={fieldForm} layout="vertical">
            <Form.Item name="fieldName" label="字段标识 (key)" rules={[{ required: true, message: '请输入字段标识' }]}>
                <Input placeholder="e.g. price" disabled={!!editingField} />
            </Form.Item>
            <Form.Item name="label" label="显示名称" rules={[{ required: true, message: '请输入显示名称' }]}>
                <Input placeholder="e.g. 价格" />
            </Form.Item>
            <Form.Item name="fieldType" label="数据类型" rules={[{ required: true, message: '请选择数据类型' }]}>
                <Select disabled={!!editingField}>
                    <Option value="STRING">文本 (String)</Option>
                    <Option value="TEXTAREA">长文本 (Textarea)</Option>
                    <Option value="NUMBER">数字 (Number)</Option>
                    <Option value="BOOLEAN">布尔 (Boolean)</Option>
                    <Option value="DATE">日期 (Date)</Option>
                    <Option value="ENUM">枚举 (Enum)</Option>
                </Select>
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
                            rules={[{ required: true, message: '请输入枚举选项的JSON数组' }]}
                            help='例如: ["选项A", "选项B", "选项C"]'>
                            <Input.TextArea rows={2} placeholder='["选项A", "选项B", "选项C"]'>
                            </Input.TextArea>
                        </Form.Item>
                    ) : null
                }
            </Form.Item>

            <Form.Item name="required" valuePropName="checked" label="是否必填">
                <Switch checkedChildren="是" unCheckedChildren="否" />
            </Form.Item>

            <Form.Item name="defaultValue" label="默认值">
                <Input placeholder="请输入默认值" />
            </Form.Item>

            <Form.Item name="orderNum" label="排序" rules={[{ required: true, message: '请输入排序号' }]}>
                <InputNumber style={{ width: '100%' }} min={0} />
            </Form.Item>
        </Form>
      </Drawer>
    </div>
  );
};

export default SchemaDesigner;
