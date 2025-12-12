import React, { useState, useEffect, useRef } from 'react';
import { Card, Input, Button, List, Avatar, Spin, Row, Col, Tag, Space, message, Typography } from 'antd';
import { SendOutlined, RobotOutlined, UserOutlined, ThunderboltOutlined, FormOutlined, RocketOutlined, TableOutlined } from '@ant-design/icons';
import { useAuth } from '../../context/AuthContext';
import { getAgents, executeAgent, type AgentInfo } from '../../api/agent';
import { useNavigate } from 'react-router-dom'; // 导入 useNavigate

const { TextArea } = Input;
const { Text } = Typography;

interface Message {
  role: 'user' | 'assistant';
  content: string; // 原始文本
  displayContent?: React.ReactNode; // 解析后的展示内容（包含卡片）
  timestamp: Date;
  executionTime?: number;
  agentType?: string;
}

const AgentPage: React.FC = () => {
  const { user, getAuthenticatedAxios } = useAuth();
  const navigate = useNavigate(); // 用于跳转
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [agents, setAgents] = useState<AgentInfo[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchAgents();
  }, []);

  // 消息滚动到底部
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const fetchAgents = async () => {
    try {
      const axios = getAuthenticatedAxios();
      const agentList = await getAgents(axios);
      setAgents(agentList);
    } catch (error) {
      console.error('Failed to fetch agents:', error);
    }
  };

  // 🔥 核心逻辑：解析 AI 回复中的 Action 标签
  const parseMessageContent = (text: string): React.ReactNode => {
    // 正则匹配 [ACTION:TYPE:VALUE]
    const actionRegex = /\[ACTION:([A-Z_]+):(.+?)\]/g;
    const match = actionRegex.exec(text);

    if (!match) {
      return <div style={{ whiteSpace: 'pre-wrap' }}>{text}</div>;
    }

    const [fullTag, actionType, actionValue] = match;
    const cleanText = text.replace(fullTag, '').trim(); // 移除标签后的纯文本

    let actionCard = null;

    // 根据 Action 类型渲染不同的卡片
    if (actionType === 'EDIT_FORM') {
      actionCard = (
        <Card size="small" style={{ marginTop: 12, border: '1px solid #1890ff', background: '#e6f7ff' }}>
          <Space>
            <FormOutlined style={{ color: '#1890ff', fontSize: 20 }} />
            <div>
              <Text strong>表单已创建</Text>
              <div style={{ fontSize: 12, color: '#666' }}>您可以立即前往设计器调整布局</div>
            </div>
            <Button 
              type="primary" 
              size="small" 
              onClick={() => navigate(`/workflow/forms`)} // 这里可以做得更细，直接跳到编辑页
            >
              去设计器
            </Button>
          </Space>
        </Card>
      );
    } else if (actionType === 'VIEW_PROCESS') {
      actionCard = (
        <Card size="small" style={{ marginTop: 12, border: '1px solid #52c41a', background: '#f6ffed' }}>
          <Space>
            <RocketOutlined style={{ color: '#52c41a', fontSize: 20 }} />
            <div>
              <Text strong>流程已启动</Text>
              <div style={{ fontSize: 12, color: '#666' }}>实例ID: {actionValue}</div>
            </div>
            <Button 
              size="small" 
              onClick={() => navigate(`/workflow/instances`)}
            >
              查看进度
            </Button>
          </Space>
        </Card>
      );
    } else if (actionType === 'SHOW_DATA') { // ✨ 新增：数据展示卡片
      actionCard = (
        <Card size="small" style={{ marginTop: 12, border: '1px solid #faad14', background: '#fffbe6' }}>
          <Space>
            <TableOutlined style={{ color: '#faad14', fontSize: 20 }} />
            <div>
              <Text strong>数据查询完成</Text>
              <div style={{ fontSize: 12, color: '#666' }}>模型: {actionValue}</div>
            </div>
            <Button 
              size="small" 
              onClick={() => navigate(`/app/data/${actionValue}`)}
            >
              查看详情
            </Button>
          </Space>
        </Card>
      );
    }

    return (
      <div>
        <div style={{ whiteSpace: 'pre-wrap' }}>{cleanText}</div>
        {actionCard}
      </div>
    );
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      role: 'user',
      content: input,
      displayContent: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const axios = getAuthenticatedAxios();
      const result = await executeAgent(axios, userMessage.content, user?.tenantId || '');

      // 处理 AI 返回的消息
      const aiText = result.success ? result.data : (result.error || '执行失败');
      
      const assistantMessage: Message = {
        role: 'assistant',
        content: aiText,
        displayContent: parseMessageContent(aiText), // 🔥 解析 Action
        timestamp: new Date(),
        executionTime: result.executionTime,
        agentType: 'AUTO' // 现在统一由 Assistant 接管，不再区分具体的 agentType
      };

      setMessages(prev => [...prev, assistantMessage]);
      
    } catch (error) {
      message.error('请求失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 24 }}>
      <Row gutter={24}>
        <Col span={18}>
          <Card title="AI 智能架构师" extra={
            <Space>
              <ThunderboltOutlined style={{ color: '#faad14' }} />
              <span>Manuflex Copilot</span>
            </Space>
          }>
            <div ref={scrollRef} style={{ height: 500, overflowY: 'auto', marginBottom: 16, padding: 16, background: '#f5f5f5', borderRadius: 8 }}>
              {messages.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#999', marginTop: 150 }}>
                  <RobotOutlined style={{ fontSize: 64, marginBottom: 16 }} />
                  <h3>我是您的全能助手</h3>
                  <p>试着对我说：</p>
                  <Space direction="vertical">
                    <Tag color="blue">"创建一个车辆管理表单，包含车牌号、品牌和购买日期"</Tag>
                    <Tag color="green">"帮我发起一个请假流程"</Tag>
                    <Tag color="orange">"查一下公司的报销规定"</Tag>
                  </Space>
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
                            style={{ backgroundColor: msg.role === 'user' ? '#1890ff' : '#000000' }}
                          />
                        }
                        title={
                          <Space>
                            {msg.role === 'user' ? '我' : 'Copilot'}
                            {msg.role === 'assistant' && msg.executionTime && (
                              <span style={{ fontSize: 12, color: '#ccc' }}>耗时: {msg.executionTime}ms</span>
                            )}
                          </Space>
                        }
                        description={
                          <div style={{ 
                            background: '#fff', 
                            padding: 16, 
                            borderRadius: '0 12px 12px 12px',
                            boxShadow: '0 2px 5px rgba(0,0,0,0.05)',
                            display: 'inline-block',
                            maxWidth: '90%'
                          }}>
                            {/* 渲染解析后的富文本内容 */}
                            {msg.displayContent}
                          </div>
                        }
                      />
                    </List.Item>
                  )}
                />
              )}
              {loading && (
                <div style={{ padding: '20px 60px' }}>
                  <Spin tip="思考中..." />
                </div>
              )}
            </div>

            <Space.Compact style={{ width: '100%' }}>
              <TextArea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="在此输入您的需求..."
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
          <Card title="能力列表" size="small">
             <List>
                <List.Item><Tag color="blue">数据建模</Tag> 自动创建表及表单</List.Item>
                <List.Item><Tag color="green">流程引擎</Tag> 流程查询与发起</List.Item>
                <List.Item><Tag color="orange">知识检索</Tag> 查阅企业文档</List.Item>
                <List.Item><Tag color="orange">数据查询</Tag> 数据查询统计</List.Item>
             </List>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default AgentPage;