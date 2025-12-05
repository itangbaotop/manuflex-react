import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { Table, Button, Modal, Form, message, Space, Popconfirm, Card, Row, Col, Input, Select, Tag } from 'antd';
import { SearchOutlined, ReloadOutlined, PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useAuth } from '../context/AuthContext';
import { getSchemaByName } from '../api/metadata';
import type { MetadataSchema } from '../api/metadata';
import { searchDynamicData, saveDynamicData, updateDynamicData, deleteDynamicData } from '../api/dynamicData';
import type { DynamicData } from '../api/dynamicData';
import { SchemaRenderer } from '../components/SchemaRenderer';
import dayjs from 'dayjs';

const { Option } = Select;

const DynamicCRUDPage: React.FC = () => {
  const params = useParams<{ schemaName: string }>();
  const location = useLocation();
  const { user, getAuthenticatedAxios } = useAuth();
  
  const schemaName = useMemo(() => {
      if (params.schemaName) return params.schemaName;
      const path = location.pathname.replace(/\/$/, '');
      return path.split('/').pop();
  }, [params.schemaName, location.pathname]);

  const [schema, setSchema] = useState<MetadataSchema | null>(null);
  const [dataList, setDataList] = useState<DynamicData[]>([]);
  const [loading, setLoading] = useState(false);
  
  // 结构: { "Car": { 1: "BMW", 2: "Audi" }, "User": { ... } }
  const [referenceMap, setReferenceMap] = useState<Record<string, Record<string, string>>>({});

  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
  const [sortField, setSortField] = useState<string | undefined>(undefined);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | undefined>(undefined);
  
  const [searchForm] = Form.useForm();
  const [activeFilters, setActiveFilters] = useState<Record<string, any>>({});

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [modalForm] = Form.useForm();

  // 1. 加载主数据
  const fetchData = useCallback(async (
      page: number, 
      size: number, 
      filters: Record<string, any>, 
      sortBy?: string, 
      order?: 'asc' | 'desc'
  ) => {
    if (!user?.tenantId || !schemaName) return;
    setLoading(true);
    try {
        const axios = getAuthenticatedAxios();
        const res = await searchDynamicData(axios, user.tenantId, schemaName, page - 1, size, filters, sortBy, order);
        setDataList(res.content);
        setPagination(prev => ({ ...prev, current: page, pageSize: size, total: res.totalElements }));
    } catch (error) {
        console.error(error);
        message.error('数据加载失败');
    } finally {
        setLoading(false);
    }
  }, [user, schemaName, getAuthenticatedAxios]);

  // 2. 加载 Schema
  useEffect(() => {
    const fetchSchema = async () => {
      if (!user?.tenantId || !schemaName) return;
      try {
        const axios = getAuthenticatedAxios();
        const schemaData = await getSchemaByName(axios, user.tenantId, schemaName);
        setSchema(schemaData);
        
        setPagination({ current: 1, pageSize: 10, total: 0 });
        setActiveFilters({});
        searchForm.resetFields();
        setReferenceMap({}); // 切换模型时清空缓存
        fetchData(1, 10, {}, undefined, undefined); 
      } catch (error) {
        console.error(error);
        message.error(`无法加载模型定义: ${schemaName}`);
      }
    };
    fetchSchema();
  }, [schemaName, user, getAuthenticatedAxios, fetchData, searchForm]);

  useEffect(() => {
      if (!schema || !schema.fields || dataList.length === 0 || !user?.tenantId) return;

      const loadReferences = async () => {
          const axios = getAuthenticatedAxios();
          const newMap = { ...referenceMap }; // 复制现有缓存
          let hasUpdate = false;

          // 遍历所有字段，找到 REFERENCE 类型的字段
          const refFields = schema.fields!.filter(f => f.fieldType === 'REFERENCE');

          for (const field of refFields) {
              const targetSchema = field.relatedSchemaName;
              const displayField = field.relatedFieldName;
              if (!targetSchema || !displayField) continue;

              // 1. 收集当前页数据中，该字段涉及的所有 ID
              const idsToFetch = dataList
                  .map(row => row.data[field.fieldName])
                  .filter(id => id !== null && id !== undefined && id !== '')
                  // 过滤掉缓存里已经有的 ID，避免重复查询
                  .filter(id => !newMap[targetSchema]?.[id]);

              // 去重
              const uniqueIds = [...new Set(idsToFetch)];

              if (uniqueIds.length > 0) {
                  try {
                      // 2. 发起批量查询: /api/data/Car?id.in=1,2,3
                      // 注意：后端必须支持 id.in 过滤 (我们在 DynamicDataServiceImpl 已实现)
                      const res = await searchDynamicData(axios, user.tenantId, targetSchema, 0, uniqueIds.length, {
                          "id.in": uniqueIds.join(',')
                      });

                      // 3. 更新缓存 Map
                      if (!newMap[targetSchema]) newMap[targetSchema] = {};
                      res.content.forEach(item => {
                          newMap[targetSchema][item.id] = item.data[displayField]; // 存名称
                      });
                      hasUpdate = true;
                  } catch (e) {
                      console.error(`批量加载 ${targetSchema} 失败`, e);
                  }
              }
          }

          if (hasUpdate) {
              setReferenceMap(newMap);
          }
      };

      loadReferences();
      // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataList, schema, user?.tenantId]); // 当 dataList 变化时触发

  const handleTableChange = (newPagination: any, _filters: any, sorter: any) => {
    const newSortOrder = sorter.order === 'descend' ? 'desc' : (sorter.order === 'ascend' ? 'asc' : undefined);
    
    // 如果没有 columnKey，再尝试用 field，并处理数组情况
    let newSortField = sorter.columnKey;
    
    if (!newSortField && sorter.field) {
        newSortField = Array.isArray(sorter.field) 
            ? sorter.field[sorter.field.length - 1] 
            : sorter.field;
    }

    setSortField(newSortField);
    setSortOrder(newSortOrder);

    fetchData(
        newPagination.current, 
        newPagination.pageSize, 
        activeFilters, 
        newSortField, 
        newSortOrder
    );
  };

  const handleSearch = async () => {
    const values = await searchForm.validateFields();
    const filters: Record<string, any> = {};
    Object.keys(values).forEach(key => {
        const value = values[key];
        if (value !== undefined && value !== null && value !== '') {
            const field = schema?.fields?.find(f => f.fieldName === key);
            if (field?.fieldType === 'STRING' || field?.fieldType === 'TEXT') {
                filters[`${key}.like`] = value;
            } else {
                filters[`${key}.eq`] = value;
            }
        }
    });
    setActiveFilters(filters);
    fetchData(1, pagination.pageSize, filters, sortField, sortOrder);
  };

  const handleReset = () => {
    searchForm.resetFields();
    setActiveFilters({});
    setSortField(undefined);
    setSortOrder(undefined);
    fetchData(1, pagination.pageSize, {}, undefined, undefined);
  };

  const handleSave = async () => {
    try {
        const values = await modalForm.validateFields();
        const axios = getAuthenticatedAxios();
        
        const formattedData = { ...values.data };
        schema?.fields?.forEach(field => {
            if ((field.fieldType === 'DATE' || field.fieldType === 'DATETIME') && formattedData[field.fieldName]) {
                formattedData[field.fieldName] = formattedData[field.fieldName].toISOString();
            }
        });

        if (editingId) {
            await updateDynamicData(axios, user!.tenantId, schemaName!, editingId, formattedData);
            message.success('更新成功');
        } else {
            await saveDynamicData(axios, user!.tenantId, schemaName!, formattedData);
            message.success('创建成功');
        }
        setIsModalVisible(false);
        modalForm.resetFields();
        setEditingId(null);
        fetchData(pagination.current, pagination.pageSize, activeFilters, sortField, sortOrder);
    } catch (error: any) {
        if (error.response?.data?.details) {
            const fieldErrors = Object.entries(error.response.data.details).map(([key, msg]) => ({
                name: ['data', key],
                errors: [msg as string]
            }));
            modalForm.setFields(fieldErrors);
        } else {
            message.error('操作失败，请检查输入');
        }
    }
  };

  const renderSearchFields = () => {
    if (!schema || !schema.fields) return null;
    return schema.fields.map(field => {
        if (['FILE', 'TEXT', 'JSON'].includes(field.fieldType)) return null; 
        let inputNode = <Input placeholder={`搜索 ${field.description || field.fieldName}`} allowClear />;
        // ... (保持原有的 inputNode 逻辑) ...
        if (field.fieldType === 'ENUM' && field.options) {
             try {
                 const opts = JSON.parse(field.options);
                 inputNode = <Select placeholder="请选择" allowClear>{opts.map((opt:string)=><Option key={opt} value={opt}>{opt}</Option>)}</Select>;
             } catch(e){}
        } else if (field.fieldType === 'BOOLEAN') {
             inputNode = <Select placeholder="请选择" allowClear><Option value="true">是</Option><Option value="false">否</Option></Select>;
        }

        return (
            <Col span={6} key={field.fieldName}>
                <Form.Item name={field.fieldName} label={field.description || field.fieldName} style={{marginBottom: 16}}>
                    {inputNode}
                </Form.Item>
            </Col>
        );
    });
  };

  const columns = [
    { 
        title: 'ID', dataIndex: 'id', key: 'id', sorter: true, width: 80, fixed: 'left' as const
    },
    {
        title: '创建人', dataIndex: 'createdBy', key: 'createdBy', width: 120,
        render: (t: string) => <Tag color="orange">{t || 'System'}</Tag>
    },
    ...(schema?.fields?.map(field => ({
      title: field.description || field.fieldName,
      dataIndex: ['data', field.fieldName],
      key: field.fieldName,
      sorter: true, 
      render: (text: any) => {
        if (text === null || text === undefined || text === '') return '-';

        if (field.fieldType === 'BOOLEAN') return text ? <Tag color="green">是</Tag> : <Tag color="red">否</Tag>;
        if (field.fieldType === 'DATETIME') return dayjs(text).format('YYYY-MM-DD HH:mm');
        if (field.fieldType === 'DATE') return dayjs(text).format('YYYY-MM-DD');
        
        // 引用类型渲染：直接查缓存 Map
        if (field.fieldType === 'REFERENCE' && field.relatedSchemaName) {
            const map = referenceMap[field.relatedSchemaName];
            const label = map ? map[text] : null;
            // 如果缓存里有名字，显示名字；否则暂时显示 ID (可能还在加载)
            return <Tag>{label || text}</Tag>;
        }
        if (field.fieldType === 'FILE') {
            const isImage = typeof text === 'string' && text.match(/\.(jpeg|jpg|gif|png|webp)$/i);
            if (isImage) {
                return <img src={text} alt="img" style={{ height: 30, borderRadius: 4, border: '1px solid #ddd' }} />;
            }
            return <a href={text} target="_blank" rel="noreferrer">下载</a>;
        }

        return text;
      }
    })) || []),
    {
        title: '操作', key: 'actions', width: 150, fixed: 'right' as const,
        render: (_: any, record: DynamicData) => (
            <Space>
                <Button type="link" size="small" icon={<EditOutlined />} onClick={() => {
                    setEditingId(record.id);
                    const formData = { ...record.data };
                    schema?.fields?.forEach(field => {
                         if ((field.fieldType === 'DATE' || field.fieldType === 'DATETIME') && formData[field.fieldName]) {
                             formData[field.fieldName] = dayjs(formData[field.fieldName]);
                         }
                    });
                    modalForm.setFieldsValue({ data: formData });
                    setIsModalVisible(true);
                }}>编辑</Button>
                <Popconfirm title="确定删除?" onConfirm={async () => {
                    await deleteDynamicData(getAuthenticatedAxios(), user!.tenantId, schemaName!, record.id);
                    message.success('已删除');
                    fetchData(pagination.current, pagination.pageSize, activeFilters, sortField, sortOrder);
                }}>
                    <Button type="link" size="small" danger icon={<DeleteOutlined />}>删除</Button>
                </Popconfirm>
            </Space>
        )
    }
  ];

  return (
    <div style={{ padding: 24 }}>
      <Card bordered={false} size="small" style={{ marginBottom: 16 }} bodyStyle={{ padding: '20px 24px 0 24px' }}>
          <div style={{ marginBottom: 16 }}>
              <h3 style={{ margin: 0 }}>{schema?.description || schemaName} 管理</h3>
          </div>
          <Form form={searchForm} labelAlign="right" labelCol={{ span: 6 }} wrapperCol={{ span: 18 }} onFinish={handleSearch}>
              <Row gutter={16}>
                  {renderSearchFields()}
                  <Col span={6} style={{ marginBottom: 16, textAlign: 'right', marginLeft: 'auto' }}>
                      <Space>
                          <Button icon={<ReloadOutlined />} onClick={handleReset}>重置</Button>
                          <Button type="primary" icon={<SearchOutlined />} htmlType="submit">查询</Button>
                      </Space>
                  </Col>
              </Row>
          </Form>
      </Card>

      <Card bordered={false}>
          <div style={{ marginBottom: 16 }}>
             <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditingId(null); modalForm.resetFields(); setIsModalVisible(true); }}>新建记录</Button>
          </div>
          <Table loading={loading} dataSource={dataList} columns={columns} rowKey="id" pagination={pagination} onChange={handleTableChange} scroll={{ x: 'max-content' }} />
      </Card>

      <Modal title={editingId ? "编辑" : "新建"} open={isModalVisible} onOk={handleSave} onCancel={() => setIsModalVisible(false)} width={720} destroyOnClose>
        <Form form={modalForm} layout="vertical">
            {schema && <SchemaRenderer fields={schema.fields || []} />}
        </Form>
      </Modal>
    </div>
  );
};

export default DynamicCRUDPage;