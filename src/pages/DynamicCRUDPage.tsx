import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Table, Button, Modal, Form, message, Space, Popconfirm } from 'antd';
import { useAuth } from '../context/AuthContext';
import { getSchemaByName, MetadataSchema } from '../api/metadata';
import { searchDynamicData, saveDynamicData, updateDynamicData, deleteDynamicData, DynamicData } from '../api/dynamicData';
import { SchemaRenderer } from '../components/SchemaRenderer';
import dayjs from 'dayjs';

const DynamicCRUDPage: React.FC = () => {
  const { schemaName } = useParams<{ schemaName: string }>(); // 从路由获取 schemaName
  const { user, getAuthenticatedAxios } = useAuth();
  
  const [schema, setSchema] = useState<MetadataSchema | null>(null);
  const [dataList, setDataList] = useState<DynamicData[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  
  const [form] = Form.useForm();

  // 1. 加载 Schema 定义
  useEffect(() => {
    const fetchSchema = async () => {
      if (!user?.tenantId || !schemaName) return;
      try {
        const axios = getAuthenticatedAxios();
        const schemaData = await getSchemaByName(axios, user.tenantId, schemaName);
        setSchema(schemaData);
        fetchData(); // 获取到 Schema 后加载数据
      } catch (error) {
        message.error('Failed to load schema definition');
      }
    };
    fetchSchema();
  }, [schemaName, user]);

  // 2. 加载数据列表
  const fetchData = async () => {
    if (!user?.tenantId || !schemaName) return;
    setLoading(true);
    try {
        const axios = getAuthenticatedAxios();
        const res = await searchDynamicData(axios, user.tenantId, schemaName);
        setDataList(res.content);
    } catch (error) {
        message.error('Failed to load data');
    } finally {
        setLoading(false);
    }
  };

  // 3. 处理提交（新建/编辑）
  const handleSubmit = async () => {
    try {
        const values = await form.validateFields();
        const axios = getAuthenticatedAxios();
        
        // 处理日期格式，Antd DatePicker 返回 dayjs 对象，需要转字符串传给后端
        const formattedData = { ...values.data };
        schema?.fields.forEach(field => {
            if ((field.fieldType === 'DATE' || field.fieldType === 'DATETIME') && formattedData[field.fieldName]) {
                formattedData[field.fieldName] = formattedData[field.fieldName].toISOString(); // 或者 format('YYYY-MM-DD')
            }
        });

        if (editingId) {
            await updateDynamicData(axios, user!.tenantId, schemaName!, editingId, formattedData);
            message.success('Updated successfully');
        } else {
            await saveDynamicData(axios, user!.tenantId, schemaName!, formattedData);
            message.success('Created successfully');
        }
        setIsModalVisible(false);
        form.resetFields();
        setEditingId(null);
        fetchData();
    } catch (error: any) {
        // 这里的 error.response.data 包含了后端返回的字段级错误 map
        // 可以在这里做更精细的错误展示
        if (error.response?.data?.details) {
            // 将后端字段错误映射回 Antd Form
            const fieldErrors = Object.entries(error.response.data.details).map(([key, msg]) => ({
                name: ['data', key],
                errors: [msg as string]
            }));
            form.setFields(fieldErrors);
        } else {
            message.error('Operation failed');
        }
    }
  };

  // 4. 动态构建表格列
  const columns = [
    { title: 'ID', dataIndex: 'id', key: 'id' },
    ...(schema?.fields.map(field => ({
      title: field.description || field.fieldName,
      dataIndex: ['data', field.fieldName], // 访问嵌套的 data 属性
      key: field.fieldName,
      render: (text: any) => {
        // 简单的渲染处理
        if (typeof text === 'boolean') return text ? 'Yes' : 'No';
        return text;
      }
    })) || []),
    {
        title: 'Actions',
        key: 'actions',
        render: (_: any, record: DynamicData) => (
            <Space>
                <Button type="link" onClick={() => {
                    setEditingId(record.id);
                    // 这里需要处理日期回填，字符串 -> dayjs
                    const formData = { ...record.data };
                    schema?.fields.forEach(field => {
                         if ((field.fieldType === 'DATE' || field.fieldType === 'DATETIME') && formData[field.fieldName]) {
                             formData[field.fieldName] = dayjs(formData[field.fieldName]);
                         }
                    });
                    form.setFieldsValue({ data: formData });
                    setIsModalVisible(true);
                }}>Edit</Button>
                <Popconfirm title="Sure to delete?" onConfirm={async () => {
                    await deleteDynamicData(getAuthenticatedAxios(), user!.tenantId, schemaName!, record.id);
                    message.success('Deleted');
                    fetchData();
                }}>
                    <Button type="link" danger>Delete</Button>
                </Popconfirm>
            </Space>
        )
    }
  ];

  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <h2>{schema?.description || schemaName} Management</h2>
        <Button type="primary" onClick={() => { setEditingId(null); form.resetFields(); setIsModalVisible(true); }}>
            Create New
        </Button>
      </div>

      <Table 
        loading={loading}
        dataSource={dataList} 
        columns={columns} 
        rowKey="id" 
      />

      <Modal
        title={editingId ? "Edit Record" : "Create Record"}
        open={isModalVisible}
        onOk={handleSubmit}
        onCancel={() => setIsModalVisible(false)}
      >
        <Form form={form} layout="vertical">
            {/* 复用我们写的渲染引擎 */}
            {schema && <SchemaRenderer fields={schema.fields} />}
        </Form>
      </Modal>
    </div>
  );
};

export default DynamicCRUDPage;