import React, { useState, useEffect } from 'react';
import { Card, Upload, Button, Table, message, Popconfirm, Tag, Space, Input, List, Avatar, Spin, Row, Col } from 'antd';
import { UploadOutlined, DeleteOutlined, FileTextOutlined, SendOutlined, RobotOutlined, UserOutlined } from '@ant-design/icons';
import { useAuth } from '../../context/AuthContext';
import { getKnowledgeDocuments, deleteKnowledgeDocument, uploadKnowledgeDocument, queryKnowledge, type KnowledgeDocument } from '../../api/file';
import type { UploadProps } from 'antd';

const { TextArea } = Input;

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const KnowledgeBasePage: React.FC = () => {
  const { user, getAuthenticatedAxios } = useAuth();
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);

  const fetchDocuments = async () => {
    if (!user?.tenantId) return;
    setLoading(true);
    try {
      const axios = getAuthenticatedAxios();
      const docs = await getKnowledgeDocuments(axios, user.tenantId);
      setDocuments(docs);
    } catch (error) {
      message.error('加载文档失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [user]);

  const uploadProps: UploadProps = {
    name: 'file',
    customRequest: async ({ file, onSuccess, onError }) => {
      if (!user?.tenantId) return;
      try {
        const axios = getAuthenticatedAxios();
        await uploadKnowledgeDocument(axios, file as File, user.tenantId, 'SOP');
        onSuccess?.(file);
        message.success(`${(file as File).name} 上传成功`);
        fetchDocuments();
      } catch (error) {
        onError?.(error as Error);
        message.error(`${(file as File).name} 上传失败`);
      }
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const axios = getAuthenticatedAxios();
      await deleteKnowledgeDocument(axios, id);
      message.success('删除成功');
      fetchDocuments();
    } catch (error) {
      message.error('删除失败');
    }
  };

  const columns = [
    {
      title: '文档名称',
      dataIndex: 'title',
      key: 'title',
      render: (text: string) => (
        <Space>
          <FileTextOutlined />
          {text}
        </Space>
      )
    },
    {
      title: '分类',
      dataIndex: 'category',
      key: 'category',
      render: (text: string) => <Tag color="blue">{text}</Tag>
    },
    {
      title: '文件大小',
      dataIndex: 'fileSize',
      key: 'fileSize',
      render: (size: number) => `${(size / 1024).toFixed(2)} KB`
    },
    {
      title: '分块数',
      dataIndex: 'chunkCount',
      key: 'chunkCount'
    },
    {
      title: '向量化状态',
      dataIndex: 'vectorStatus',
      key: 'vectorStatus',
      render: (status: string) => {
        const colorMap: any = {
          PENDING: 'default',
          PROCESSING: 'processing',
          COMPLETED: 'success',
          FAILED: 'error'
        };
        return <Tag color={colorMap[status]}>{status}</Tag>;
      }
    },
    {
      title: '上传时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (text: string) => new Date(text).toLocaleString()
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: KnowledgeDocument) => (
        <Popconfirm title="确定删除?" onConfirm={() => handleDelete(record.id)}>
          <Button type="link" danger icon={<DeleteOutlined />}>删除</Button>
        </Popconfirm>
      )
    }
  ];

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      role: 'user',
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setChatLoading(true);

    try {
      const axios = getAuthenticatedAxios();
      const answer = await queryKnowledge(axios, input, user?.tenantId || '');

      const assistantMessage: Message = {
        role: 'assistant',
        content: answer,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: Message = {
        role: 'assistant',
        content: '抱歉，查询失败，请稍后重试。',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <div style={{ padding: 24 }}>
      <Row gutter={24}>
        <Col span={14}>
          <Card title="知识库管理" extra={
            <Upload {...uploadProps}>
              <Button type="primary" icon={<UploadOutlined />}>上传文档</Button>
            </Upload>
          }>
            <Table
              loading={loading}
              dataSource={documents}
              columns={columns}
              rowKey="id"
              size="small"
            />
          </Card>
        </Col>
        <Col span={10}>
          <Card title="AI 知识问答">
            <div style={{ height: 400, overflowY: 'auto', marginBottom: 16, padding: 16, background: '#f5f5f5', borderRadius: 8 }}>
              {messages.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#999', marginTop: 100 }}>
                  <RobotOutlined style={{ fontSize: 48, marginBottom: 16 }} />
                  <p>你好！我是 AI 助手，有什么可以帮你的吗？</p>
                </div>
              ) : (
                <List
                  dataSource={messages}
                  renderItem={(msg) => (
                    <List.Item style={{ border: 'none', padding: '8px 0' }}>
                      <List.Item.Meta
                        avatar={
                          <Avatar
                            icon={msg.role === 'user' ? <UserOutlined /> : <RobotOutlined />}
                            style={{ backgroundColor: msg.role === 'user' ? '#1890ff' : '#52c41a' }}
                          />
                        }
                        title={msg.role === 'user' ? '你' : 'AI 助手'}
                        description={
                          <div style={{ 
                            background: '#fff', 
                            padding: 12, 
                            borderRadius: 8,
                            whiteSpace: 'pre-wrap'
                          }}>
                            {msg.content}
                          </div>
                        }
                      />
                    </List.Item>
                  )}
                />
              )}
              {chatLoading && (
                <div style={{ textAlign: 'center', padding: 20 }}>
                  <Spin tip="AI 正在思考..." />
                </div>
              )}
            </div>

            <Space.Compact style={{ width: '100%' }}>
              <TextArea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="输入你的问题..."
                autoSize={{ minRows: 2, maxRows: 4 }}
                onPressEnter={(e) => {
                  if (!e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
              />
              <Button
                type="primary"
                icon={<SendOutlined />}
                onClick={handleSend}
                loading={chatLoading}
                style={{ height: 'auto' }}
              >
                发送
              </Button>
            </Space.Compact>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default KnowledgeBasePage;
