import React, { useState, useEffect } from 'react';
import { Card, Input, Button, List, Avatar, Spin, Row, Col, Tag, Space, message } from 'antd';
import { SendOutlined, RobotOutlined, UserOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { useAuth } from '../../context/AuthContext';
import { getAgents, executeAgent, type AgentInfo, type AgentResult } from '../../api/agent';

const { TextArea } = Input;

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  executionTime?: number;
  agentType?: string;
}



const AgentPage: React.FC = () => {
  const { user, getAuthenticatedAxios } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [agents, setAgents] = useState<AgentInfo[]>([]);

  useEffect(() => {
    fetchAgents();
  }, []);

  const fetchAgents = async () => {
    try {
      const axios = getAuthenticatedAxios();
      console.log('Fetching agents through gateway...');
      const agentList = await getAgents(axios);
      setAgents(agentList);
      console.log('Agents loaded:', agentList);
    } catch (error) {
      console.error('Failed to fetch agents:', error);
      message.error('获取Agent列表失败');
    }
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      role: 'user',
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const axios = getAuthenticatedAxios();
      console.log('Executing agent through gateway...');
      const result = await executeAgent(axios, input, user?.tenantId || '');
      console.log('Agent result:', result);

      const assistantMessage: Message = {
        role: 'assistant',
        content: result.success ? result.message + '\n\n' + JSON.stringify(result.data, null, 2) : result.error || '执行失败',
        timestamp: new Date(),
        executionTime: result.executionTime,
        agentType: result.metadata?.agentType
      };

      setMessages(prev => [...prev, assistantMessage]);
      
      if (result.success) {
        message.success('任务执行成功');
      } else {
        message.error('任务执行失败');
      }
    } catch (error) {
      const errorMessage: Message = {
        role: 'assistant',
        content: '抱歉，执行失败，请稍后重试。',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
      message.error('请求失败');
    } finally {
      setLoading(false);
    }
  };

  const getAgentColor = (type: string) => {
    const colors: Record<string, string> = {
      FORM: 'blue',
      WORKFLOW: 'green', 
      DATA: 'orange',
      GENERAL: 'purple'
    };
    return colors[type] || 'default';
  };

  return (
    <div style={{ padding: 24 }}>
      <Row gutter={24}>
        <Col span={18}>
          <Card title="AI 智能助手" extra={
            <Space>
              <ThunderboltOutlined />
              <span>智能化无代码平台</span>
            </Space>
          }>
            <div style={{ height: 500, overflowY: 'auto', marginBottom: 16, padding: 16, background: '#f5f5f5', borderRadius: 8 }}>
              {messages.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#999', marginTop: 150 }}>
                  <RobotOutlined style={{ fontSize: 64, marginBottom: 16 }} />
                  <h3>欢迎使用 ManuFlex AI 助手</h3>
                  <p>我可以帮您：</p>
                  <ul style={{ textAlign: 'left', display: 'inline-block' }}>
                    <li>🎯 自动生成表单和数据模型</li>
                    <li>⚡ 创建业务工作流程</li>
                    <li>📊 进行数据分析和统计</li>
                    <li>💡 回答平台使用问题</li>
                  </ul>
                </div>
              ) : (
                <List
                  dataSource={messages}
                  renderItem={(msg) => (
                    <List.Item style={{ border: 'none', padding: '12px 0' }}>
                      <List.Item.Meta
                        avatar={
                          <Avatar
                            icon={msg.role === 'user' ? <UserOutlined /> : <RobotOutlined />}
                            style={{ backgroundColor: msg.role === 'user' ? '#1890ff' : '#52c41a' }}
                          />
                        }
                        title={
                          <Space>
                            {msg.role === 'user' ? '你' : 'AI 助手'}
                            {msg.agentType && (
                              <Tag color={getAgentColor(msg.agentType)} size="small">
                                {msg.agentType}
                              </Tag>
                            )}
                            {msg.executionTime && (
                              <Tag size="small">{msg.executionTime}ms</Tag>
                            )}
                          </Space>
                        }
                        description={
                          <div style={{ 
                            background: '#fff', 
                            padding: 16, 
                            borderRadius: 8,
                            whiteSpace: 'pre-wrap',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                          }}>
                            {msg.content}
                          </div>
                        }
                      />
                    </List.Item>
                  )}
                />
              )}
              {loading && (
                <div style={{ textAlign: 'center', padding: 20 }}>
                  <Spin tip="AI 正在处理您的请求..." />
                </div>
              )}
            </div>

            <Space.Compact style={{ width: '100%' }}>
              <TextArea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="请描述您的需求，例如：创建一个产品管理表单、设计质量检测流程、分析生产数据..."
                autoSize={{ minRows: 3, maxRows: 6 }}
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
                loading={loading}
                style={{ height: 'auto' }}
                size="large"
              >
                发送
              </Button>
            </Space.Compact>
          </Card>
        </Col>
        
        <Col span={6}>
          <Card title="可用助手" size="small">
            <List
              dataSource={agents}
              renderItem={(agent) => (
                <List.Item style={{ padding: '8px 0' }}>
                  <List.Item.Meta
                    avatar={
                      <Avatar 
                        style={{ backgroundColor: getAgentColor(agent.type) }}
                        size="small"
                      >
                        {agent.name.charAt(0)}
                      </Avatar>
                    }
                    title={<span style={{ fontSize: '14px' }}>{agent.name}</span>}
                    description={
                      <div>
                        <Tag color={getAgentColor(agent.type)} size="small">
                          {agent.type}
                        </Tag>
                        <div style={{ fontSize: '12px', color: '#666', marginTop: 4 }}>
                          {agent.description}
                        </div>
                      </div>
                    }
                  />
                </List.Item>
              )}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default AgentPage;