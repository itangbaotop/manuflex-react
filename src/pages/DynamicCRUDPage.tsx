import React, { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Table, Button, Modal, Form, message, Space, Popconfirm, Card, Row, Col, Input, Select } from 'antd';
import { SearchOutlined, ReloadOutlined, PlusOutlined } from '@ant-design/icons';
import { useAuth } from '../context/AuthContext';
import { getSchemaByName } from '../api/metadata';
import type { MetadataSchema } from '../api/metadata';
import { searchDynamicData, saveDynamicData, updateDynamicData, deleteDynamicData } from '../api/dynamicData';
import type { DynamicData } from '../api/dynamicData';
import { SchemaRenderer } from '../components/SchemaRenderer';
import dayjs from 'dayjs';

const { Option } = Select;

const DynamicCRUDPage: React.FC = () => {
  const { schemaName } = useParams<{ schemaName: string }>();
  const { user, getAuthenticatedAxios } = useAuth();
  
  // 核心数据状态
  const [schema, setSchema] = useState<MetadataSchema | null>(null);
  const [dataList, setDataList] = useState<DynamicData[]>([]);
  const [loading, setLoading] = useState(false);
  
  // 分页与排序状态
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
  const [sortField, setSortField] = useState<string | undefined>(undefined);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | undefined>(undefined);
  
  // 搜索表单状态
  const [searchForm] = Form.useForm();
  const [activeFilters, setActiveFilters] = useState<Record<string, any>>({});

  // 编辑/新建 模态框状态
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [modalForm] = Form.useForm();

  // 1. 初始化加载 Schema
  useEffect(() => {
    const fetchSchema = async () => {
      if (!user?.tenantId || !schemaName) return;
      try {
        const axios = getAuthenticatedAxios();
        const schemaData = await getSchemaByName(axios, user.tenantId, schemaName);
        setSchema(schemaData);
        // Schema 加载完成后，重置状态并加载第一页数据
        setPagination({ current: 1, pageSize: 10, total: 0 });
        setActiveFilters({});
        fetchData(1, 10, {}, undefined, undefined); 
      } catch (error) {
        message.error('无法加载元数据定义');
      }
    };
    fetchSchema();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schemaName, user]);

  // 2. 通用数据加载函数
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
        // 注意：后端 page 从 0 开始，前端 Antd 从 1 开始
        const res = await searchDynamicData(axios, user.tenantId, schemaName, page - 1, size, filters, sortBy, order);
        setDataList(res.content);
        setPagination(prev => ({ ...prev, current: page, pageSize: size, total: res.totalElements }));
    } catch (error) {
        message.error('数据加载失败');
    } finally {
        setLoading(false);
    }
  }, [user, schemaName, getAuthenticatedAxios]);

  // 3. 处理表格变化（分页、排序）
  const handleTableChange = (newPagination: any, _filters: any, sorter: any) => {
    const newSortOrder = sorter.order === 'descend' ? 'desc' : (sorter.order === 'ascend' ? 'asc' : undefined);
    const newSortField = sorter.order ? sorter.field : undefined; // 如果取消排序，则字段为 undefined

    setSortField(newSortField);
    setSortOrder(newSortOrder);

    fetchData(
        newPagination.current, 
        newPagination.pageSize, 
        activeFilters, // 保持当前的搜索条件
        newSortField, 
        newSortOrder
    );
  };

  // 4. 处理搜索提交
  const handleSearch = async () => {
    const values = await searchForm.validateFields();
    const filters: Record<string, any> = {};

    // 智能构建过滤条件
    Object.keys(values).forEach(key => {
        const value = values[key];
        if (value !== undefined && value !== null && value !== '') {
            // 从 key 中获取字段定义，判断类型 (这里简单处理，实际可根据 schema 查找)
            const field = schema?.fields.find(f => f.fieldName === key);
            
            if (field?.fieldType === 'STRING' || field?.fieldType === 'TEXT') {
                // 字符串默认使用 LIKE
                filters[`${key}.like`] = value;
            } else {
                // 其他类型默认使用 EQ
                filters[`${key}.eq`] = value;
            }
        }
    });

    setActiveFilters(filters);
    // 搜索时重置回第一页
    fetchData(1, pagination.pageSize, filters, sortField, sortOrder);
  };

  // 5. 处理重置
  const handleReset = () => {
    searchForm.resetFields();
    setActiveFilters({});
    setSortField(undefined);
    setSortOrder(undefined);
    fetchData(1, pagination.pageSize, {}, undefined, undefined);
  };

  // 6. 处理新建/编辑保存
  const handleSave = async () => {
    try {
        const values = await modalForm.validateFields();
        const axios = getAuthenticatedAxios();
        
        // 数据格式化：将 dayjs 转回 ISO 字符串
        const formattedData = { ...values.data };
        schema?.fields.forEach(field => {
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
        // 刷新当前页
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

  // 7. 渲染搜索表单项
  const renderSearchFields = () => {
    if (!schema) return null;
    return schema.fields.map(field => {
        // 只对部分类型生成搜索框，避免界面太乱
        if (['FILE', 'TEXT'].includes(field.fieldType)) return null; 

        let inputNode = <Input placeholder={`搜索 ${field.description || field.fieldName}`} />;
        
        if (field.fieldType === 'ENUM' && field.options) {
            try {
                const opts = JSON.parse(field.options);
                inputNode = (
                    <Select placeholder={`选择 ${field.description || field.fieldName}`} allowClear>
                        {opts.map((opt: string) => <Option key={opt} value={opt}>{opt}</Option>)}
                    </Select>
                );
            } catch(e) {}
        } else if (field.fieldType === 'BOOLEAN') {
            inputNode = (
                 <Select placeholder={`选择 ${field.description || field.fieldName}`} allowClear>
                    <Option value="true">是</Option>
                    <Option value="false">否</Option>
                </Select>
            );
        }

        return (
            <Col span={6} key={field.fieldName}>
                <Form.Item name={field.fieldName} label={field.description || field.fieldName}>
                    {inputNode}
                </Form.Item>
            </Col>
        );
    });
  };

  // 8. 表格列定义
  const columns = [
    { 
        title: 'ID', 
        dataIndex: 'id', 
        key: 'id', 
        sorter: true, // 开启服务端排序
        width: 80 
    },
    ...(schema?.fields.map(field => ({
      title: field.description || field.fieldName,
      dataIndex: ['data', field.fieldName],
      key: field.fieldName,
      sorter: true, // 开启服务端排序
      render: (text: any) => {
        if (field.fieldType === 'BOOLEAN') return text ? '是' : '否';
        if (!text) return '-';
        if (field.fieldType === 'DATETIME') return dayjs(text).format('YYYY-MM-DD HH:mm');
        if (field.fieldType === 'DATE') return dayjs(text).format('YYYY-MM-DD');
        return text;
      }
    })) || []),
    {
        title: '操作',
        key: 'actions',
        width: 150,
        render: (_: any, record: DynamicData) => (
            <Space>
                <Button type="link" onClick={() => {
                    setEditingId(record.id);
                    // 反向转换：字符串 -> dayjs
                    const formData = { ...record.data };
                    schema?.fields.forEach(field => {
                         if ((field.fieldType === 'DATE' || field.fieldType === 'DATETIME') && formData[field.fieldName]) {
                             formData[field.fieldName] = dayjs(formData[field.fieldName]);
                         }
                    });
                    modalForm.setFieldsValue({ data: formData });
                    setIsModalVisible(true);
                }}>编辑</Button>
                <Popconfirm title="确定删除吗?" onConfirm={async () => {
                    await deleteDynamicData(getAuthenticatedAxios(), user!.tenantId, schemaName!, record.id);
                    message.success('已删除');
                    fetchData(pagination.current, pagination.pageSize, activeFilters, sortField, sortOrder);
                }}>
                    <Button type="link" danger>删除</Button>
                </Popconfirm>
            </Space>
        )
    }
  ];

  return (
    <div style={{ padding: 24 }}>
      <Card bordered={false} style={{ marginBottom: 24 }}>
          <div style={{ marginBottom: 16 }}>
              <h2>{schema?.description || schemaName} 管理</h2>
          </div>
          
          {/* 搜索区域 */}
          <Form form={searchForm} layout="vertical" onFinish={handleSearch}>
              <Row gutter={24}>
                  {renderSearchFields()}
              </Row>
              <Row>
                  <Col span={24} style={{ textAlign: 'right' }}>
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
             <Button type="primary" icon={<PlusOutlined />} onClick={() => { 
                 setEditingId(null); 
                 modalForm.resetFields(); 
                 setIsModalVisible(true); 
             }}>
                新建记录
            </Button>
          </div>

          <Table 
            loading={loading}
            dataSource={dataList} 
            columns={columns} 
            rowKey="id" 
            pagination={pagination}
            onChange={handleTableChange}
            scroll={{ x: 'max-content' }}
          />
      </Card>

      <Modal
        title={editingId ? "编辑记录" : "新建记录"}
        open={isModalVisible}
        onOk={handleSave}
        onCancel={() => setIsModalVisible(false)}
        width={720}
      >
        <Form form={modalForm} layout="vertical">
            {schema && <SchemaRenderer fields={schema.fields} />}
        </Form>
      </Modal>
    </div>
  );
};

export default DynamicCRUDPage;