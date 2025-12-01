import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Table, Button, Modal, Form, Input, message, Popconfirm, Space, Card, Tag, DatePicker, InputNumber, Select, Switch } from 'antd';
import { PlusOutlined, DeleteOutlined, EditOutlined, EyeOutlined } from '@ant-design/icons';
import { useAuth } from '../context/AuthContext';
import { getSchemas, getSchemaById } from '../api/metadata';
import type { MetadataSchemaDTO, MetadataFieldDTO } from '../api/metadata';
import { SchemaRenderer } from '../components/SchemaRenderer';
// 修正导入：直接从 dynamicData.ts 导入 DTOs，并正确使用 useDynamicDataApi Hook
import {
  useDynamicDataApi
} from '../api/dynamicData';
import type { PageRequestDTO, PageResponseDTO } from '../api/dynamicData';
import type { ColumnType } from 'antd/lib/table'; // 导入 ColumnType
import { Spin } from 'antd/lib';

const { RangePicker } = DatePicker;
const { Option } = Select;
const { TextArea } = Input;

// 辅助函数：根据 fieldType 渲染不同的搜索输入组件
const renderSearchInput = (field: MetadataFieldDTO, onChange: (value: any) => void, value: any) => {
  switch (field.fieldType) {
    case 'STRING':
    case 'TEXTAREA':
      return <Input placeholder={`搜索 ${field.label}`} onChange={(e) => onChange(e.target.value)} value={value} />;
    case 'NUMBER':
      return <InputNumber placeholder={`搜索 ${field.label}`} style={{ width: '100%' }} onChange={onChange} value={value} />;
    case 'BOOLEAN':
      return (
        <Select placeholder={`搜索 ${field.label}`} allowClear onChange={onChange} value={value}>
          <Option value={true}>是</Option>
          <Option value={false}>否</Option>
        </Select>
      );
    case 'DATE':
      return <DatePicker placeholder={`搜索 ${field.label}`} style={{ width: '100%' }} onChange={onChange} value={value} />;
    case 'ENUM':
      return (
        <Select placeholder={`搜索 ${field.label}`} allowClear onChange={onChange} value={value}>
          {field.options?.map(opt => <Option key={opt} value={opt}>{opt}</Option>)}
        </Select>
      );
    default:
      return <Input placeholder={`不支持的搜索类型: ${field.fieldType}`} disabled />;
  }
};


const DynamicCRUDPage: React.FC = () => {
  const { schemaName } = useParams<{ schemaName: string }>();
  const { getAuthenticatedAxios, user, hasPermission } = useAuth();
  // 正确使用 useDynamicDataApi Hook
  const { getDynamicData, createDynamicData, updateDynamicData, deleteDynamicData } = useDynamicDataApi();

  const [schema, setSchema] = useState<MetadataSchemaDTO | null>(null);
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10 });
  const [filters, setFilters] = useState<Record<string, any>>({});
  const [sort, setSort] = useState<{ field?: string; order?: 'asc' | 'desc' | undefined }>({});

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<any | null>(null);
  const [form] = Form.useForm();

  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [viewingRecord, setViewingRecord] = useState<any | null>(null);


  const fetchSchemaAndData = useCallback(async () => {
    if (!user?.tenantId || !schemaName) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const authAxios = getAuthenticatedAxios();
      const allSchemas = await getSchemas(authAxios, user.tenantId);
      const foundSchema = allSchemas.find((s: MetadataSchemaDTO) => s.name === schemaName); // 明确 s 的类型

      if (foundSchema) {
        const detailedSchema = await getSchemaById(authAxios, foundSchema.id);
        setSchema(detailedSchema);

        const pageRequest: PageRequestDTO = {
          page: pagination.current - 1,
          size: pagination.pageSize,
          sortBy: sort.field,
          sortOrder: sort.order,
          filters: Object.entries(filters).map(([fieldName, value]) => ({
            fieldName,
            operator: 'EQ',
            value: String(value),
          })),
        };
        // 调用 useDynamicDataApi 返回的函数
        const dynamicDataResponse: PageResponseDTO<any> = await getDynamicData(schemaName, pageRequest);
        setData(dynamicDataResponse.content);
        setTotal(dynamicDataResponse.totalElements);

      } else {
        message.error(`未找到名为 "${schemaName}" 的模型`);
        setSchema(null);
      }
    } catch (err) {
      console.error('加载模型或数据失败', err);
      message.error('加载模型或数据失败');
    } finally {
      setLoading(false);
    }
  }, [user?.tenantId, schemaName, pagination.current, pagination.pageSize, filters, sort, getAuthenticatedAxios, getSchemas, getSchemaById, getDynamicData]);

  useEffect(() => {
    fetchSchemaAndData();
  }, [fetchSchemaAndData]);

  const handleTableChange = (pagination: any, filters: any, sorter: any) => {
    setPagination({
      current: pagination.current,
      pageSize: pagination.pageSize,
    });
    if (sorter.field && sorter.order) {
      setSort({
        field: sorter.field as string,
        order: sorter.order === 'ascend' ? 'asc' : 'desc',
      });
    } else {
      setSort({});
    }
  };

  const handleSearch = (values: Record<string, any>) => {
    setFilters(values);
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  const openEditCreateModal = (record?: any) => {
    setEditingRecord(record || null);
    if (record) {
      form.setFieldsValue(record);
    } else {
      form.resetFields();
    }
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const values = await form.validateFields();

      if (!schema?.name) {
        message.error('模型信息缺失，无法保存');
        setLoading(false);
        return;
      }

      if (editingRecord) {
        await updateDynamicData(schema.name, editingRecord.id, values);
        message.success('数据更新成功');
      } else {
        await createDynamicData(schema.name, values);
        message.success('数据创建成功');
      }

      setIsModalOpen(false);
      fetchSchemaAndData();
    } catch (err: any) {
      console.error('保存数据失败', err);
      const msg = err.response?.data?.message || '保存失败';
      message.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    setLoading(true);
    try {
      if (!schema?.name) {
        message.error('模型信息缺失，无法删除');
        setLoading(false);
        return;
      }
      await deleteDynamicData(schema.name, id);
      message.success('数据已删除');
      fetchSchemaAndData();
    } catch (err) {
      console.error('删除数据失败', err);
      message.error('删除失败');
    } finally {
      setLoading(false);
    }
  };

  // 根据 Schema 的字段动态生成 Table Columns
  const columns = useMemo(() => {
    if (!schema?.fields) return [];

    const dynamicColumns: ColumnType<any>[] = schema.fields // 明确 dynamicColumns 类型
      .sort((a, b) => a.orderNum - b.orderNum)
      .map((field: MetadataFieldDTO) => ({
        title: field.label,
        dataIndex: field.fieldName,
        key: field.fieldName,
        sorter: true,
        render: (value: any) => { // 明确 render 参数类型
          if (field.fieldType === 'BOOLEAN') {
            return <Tag color={value ? 'green' : 'red'}>{value ? '是' : '否'}</Tag>;
          }
          if (field.fieldType === 'DATE') {
            return value ? new Date(value).toLocaleDateString() : '-';
          }
          return value;
        },
      }));

    // 添加操作列
    dynamicColumns.push({
      title: '操作',
      key: 'action',
      render: (_: any, record: any) => ( // 明确 render 参数类型
        <Space size="middle">
          {hasPermission('data:read') && (
            <Button type="link" icon={<EyeOutlined />} onClick={() => {
                setViewingRecord(record);
                setIsViewModalOpen(true);
            }}>查看</Button>
          )}
          {hasPermission('data:update') && (
            <Button type="link" icon={<EditOutlined />} onClick={() => openEditCreateModal(record)}>编辑</Button>
          )}
          {hasPermission('data:delete') && (
            <Popconfirm title="确定删除此数据?" onConfirm={() => handleDelete(record.id)}>
              <Button type="link" danger icon={<DeleteOutlined />}>删除</Button>
            </Popconfirm>
          )}
        </Space>
      ),
    });

    return dynamicColumns;
  }, [schema?.fields, hasPermission, handleDelete]);

  // 动态生成搜索表单
  const SearchForm = useMemo(() => {
    if (!schema?.fields) return null;

    const fieldsToSearch = schema.fields.filter((field: MetadataFieldDTO) => field.fieldType !== 'BOOLEAN');

    return (
      <Form layout="inline" onFinish={handleSearch} initialValues={filters}>
        {fieldsToSearch.map((field: MetadataFieldDTO) => (
          <Form.Item key={field.fieldName} name={field.fieldName} label={field.label}>
            {renderSearchInput(field, (val) => form.setFieldValue(field.fieldName, val), filters[field.fieldName])}
          </Form.Item>
        ))}
        <Form.Item>
          <Button type="primary" htmlType="submit">搜索</Button>
        </Form.Item>
      </Form>
    );
  }, [schema?.fields, filters, handleSearch, form]);


  if (!schema) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <Spin spinning={loading} tip="加载模型中..." />
        {!loading && <p>未找到模型或加载失败。</p>}
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      <Card
        title={`动态数据管理 - ${schema.description}`}
        extra={
          <Space>
            {hasPermission('data:create') && (
                <Button type="primary" icon={<PlusOutlined />} onClick={() => openEditCreateModal()}>新增数据</Button>
            )}
            {/* 导入导出按钮，待实现 */}
            {hasPermission('data:import') && <Button>导入</Button>}
            {hasPermission('data:export') && <Button>导出</Button>}
          </Space>
        }
        loading={loading}
      >
        <div style={{ marginBottom: 16 }}>
            {SearchForm}
        </div>
        <Table
          rowKey="id"
          columns={columns}
          dataSource={data}
          loading={loading}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条`,
          }}
          onChange={handleTableChange}
        />
      </Card>

      {/* 创建/编辑数据的 Modal */}
      <Modal
        title={editingRecord ? `编辑 ${schema.description} 数据` : `新增 ${schema.description} 数据`}
        open={isModalOpen}
        onOk={handleSave}
        onCancel={() => { setIsModalOpen(false); form.resetFields(); setEditingRecord(null); }}
        confirmLoading={loading}
        width={600}
      >
        <Form form={form} layout="vertical">
          {schema.fields && <SchemaRenderer fields={schema.fields} />}
        </Form>
      </Modal>

      {/* 查看详情 Modal */}
      <Modal
        title={`查看 ${schema.description} 详情`}
        open={isViewModalOpen}
        onCancel={() => { setIsViewModalOpen(false); setViewingRecord(null); }}
        footer={null}
        width={600}
      >
        {viewingRecord && (
          <Form layout="vertical">
            {schema.fields.map((field: MetadataFieldDTO) => (
              <Form.Item key={field.id} label={field.label}>
                {field.fieldType === 'BOOLEAN' ? (
                  <Tag color={viewingRecord[field.fieldName] ? 'green' : 'red'}>
                    {viewingRecord[field.fieldName] ? '是' : '否'}
                  </Tag>
                ) : field.fieldType === 'DATE' ? (
                  <span>{viewingRecord[field.fieldName] ? new Date(viewingRecord[field.fieldName]).toLocaleDateString() : '-'}</span>
                ) : (
                  <span>{String(viewingRecord[field.fieldName] || '-')}</span>
                )}
              </Form.Item>
            ))}
          </Form>
        )}
      </Modal>
    </div>
  );
};

export default DynamicCRUDPage;
