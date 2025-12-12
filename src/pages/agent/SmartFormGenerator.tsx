import React, { useState } from 'react';
import { Card, Input, Button, Form, Table, Tag, Space, message, Spin, Row, Col } from 'antd';
import { PlusOutlined, ThunderboltOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { useAuth } from '../../context/AuthContext';
import { generateForm, type FormConfig, type FormField } from '../../api/agent';

const { TextArea } = Input;

const SmartFormGenerator: React.FC = () => {
  const { user, getAuthenticatedAxios } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formConfig, setFormConfig] = useState<FormConfig | null>(null);
  const [description, setDescription] = useState('');

  const handleGenerate = async () => {
    if (!description.trim()) {
      message.warning('请输入表单描述');
      return;
    }

    setLoading(true);
    try {
      const axios = getAuthenticatedAxios();
      const config = await generateForm(axios, description, user?.tenantId || '');
      setFormConfig(config);
      message.success('表单生成成功！');
    } catch (error) {
      console.error('Form generation failed:', error);
      message.error('表单生成失败');
    } finally {
      setLoading(false);
    }
  };

  const fieldColumns = [
    {
      title: '字段名',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '标签',
      dataIndex: 'label',
      key: 'label',
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => (
        <Tag color={getFieldTypeColor(type)}>{type}</Tag>
      ),
    },
    {
      title: '必填',
      dataIndex: 'required',
      key: 'required',
      render: (required: boolean) => (
        required ? <Tag color="red">必填</Tag> : <Tag>可选</Tag>
      ),
    },
    {
      title: '选项',
      dataIndex: 'options',
      key: 'options',
      render: (options: string[]) => (
        options ? options.join(', ') : '-'
      ),
    },
  ];

  const getFieldTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      TEXT: 'blue',
      NUMBER: 'green',
      DATE: 'orange',
      SELECT: 'purple',
      BOOLEAN: 'cyan'
    };
    return colors[type] || 'default';
  };

  return (
    <div style={{ padding: 24 }}>
      <Row gutter={24}>
        <Col span={12}>
          <Card 
            title={
              <Space>
                <ThunderboltOutlined />
                智能表单生成器
              </Space>
            }
          >
            <Form layout="vertical">
              <Form.Item label="表单描述" required>
                <TextArea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="请描述您需要的表单，例如：&#10;- 产品信息管理表单，包含产品名称、型号、价格、分类等字段&#10;- 员工入职表单，包含姓名、部门、职位、联系方式等&#10;- 质量检测记录表单，包含检测项目、结果、检测人员等"
                  autoSize={{ minRows: 6, maxRows: 10 }}
                />
              </Form.Item>
              <Form.Item>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={handleGenerate}
                  loading={loading}
                  size="large"
                  block
                >
                  {loading ? 'AI 正在生成表单...' : '生成表单'}
                </Button>
              </Form.Item>
            </Form>
          </Card>
        </Col>

        <Col span={12}>
          <Card 
            title="生成结果"
            extra={
              formConfig?.created && (
                <Tag color="green" icon={<CheckCircleOutlined />}>
                  已创建 Schema #{formConfig.schemaId}
                </Tag>
              )
            }
          >
            {loading ? (
              <div style={{ textAlign: 'center', padding: 60 }}>
                <Spin size="large" tip="AI 正在分析您的需求并生成表单..." />
              </div>
            ) : formConfig ? (
              <Space direction="vertical" style={{ width: '100%' }}>
                <div>
                  <h3>{formConfig.formName}</h3>
                  <p style={{ color: '#666' }}>{formConfig.description}</p>
                </div>
                
                <Table
                  dataSource={formConfig.fields}
                  columns={fieldColumns}
                  pagination={false}
                  size="small"
                  rowKey="name"
                />

                {formConfig.created && (
                  <div style={{ 
                    background: '#f6ffed', 
                    border: '1px solid #b7eb8f',
                    borderRadius: 6,
                    padding: 12,
                    marginTop: 16
                  }}>
                    <Space>
                      <CheckCircleOutlined style={{ color: '#52c41a' }} />
                      <span>表单已成功创建到元数据服务，Schema ID: {formConfig.schemaId}</span>
                    </Space>
                  </div>
                )}
              </Space>
            ) : (
              <div style={{ textAlign: 'center', color: '#999', padding: 60 }}>
                <ThunderboltOutlined style={{ fontSize: 48, marginBottom: 16 }} />
                <p>请在左侧输入表单描述，AI 将为您生成完整的表单结构</p>
              </div>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default SmartFormGenerator;