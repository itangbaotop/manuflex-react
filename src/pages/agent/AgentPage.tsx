import React, { useState, useEffect, useRef } from 'react';
import { Card, Input, Button, List, Avatar, Spin, Row, Col, Tag, Space, message, Typography } from 'antd';
import { 
  SendOutlined, 
  RobotOutlined, 
  UserOutlined, 
  ThunderboltOutlined, 
  FormOutlined, 
  RocketOutlined, 
  TableOutlined,
  StopOutlined // 新增停止图标
} from '@ant-design/icons';
import { useAuth } from '../../context/AuthContext';
import { getAgents, type AgentInfo } from '../../api/agent'; 
import { useNavigate } from 'react-router-dom';
import { fetchSSE } from '../../utils/sseUtils'; // 引入 SSE 工具函数

const { TextArea } = Input;
const { Text } = Typography;

interface Message {
  role: 'user' | 'assistant';
  content: string; 
  displayContent?: React.ReactNode; 
  timestamp: Date;
  executionTime?: number;
  agentType?: string;
}

const AgentPage: React.FC = () => {
  const { user, getAuthenticatedAxios, accessToken } = useAuth();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [agents, setAgents] = useState<AgentInfo[]>([]);
  
  // 用于控制滚动和取消请求
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

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
    
    // 如果还没传输完（例如只传了一半 [ACTION:EDIT_ ），保持原样显示，直到传输完成
    // 为了防止渲染闪烁，这里我们只解析完整的标签
    const match = actionRegex.exec(text);

    if (!match) {
      return <div style={{ whiteSpace: 'pre-wrap' }}>{text}</div>;
    }

    const [fullTag, actionType, actionValue] = match;
    const cleanText = text.replace(fullTag, '').trim(); 

    let actionCard = null;

    if (actionType === 'EDIT_FORM') {
      actionCard = (
        <Card size="small" style={{ marginTop: 12, border: '1px solid #1890ff', background: '#e6f7ff' }}>
          <Space>
            <FormOutlined style={{ color: '#1890ff', fontSize: 20 }} />
            <div>
              <Text strong>表单已创建</Text>
              <div style={{ fontSize: 12, color: '#666' }}>您可以立即前往设计器调整布局</div>
            </div>
            <Button type="primary" size="small" onClick={() => navigate(`/workflow/forms`)}>
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
            <Button size="small" onClick={() => navigate(`/workflow/instances`)}>
              查看进度
            </Button>
          </Space>
        </Card>
      );
    } else if (actionType === 'SHOW_DATA') {
      actionCard = (
        <Card size="small" style={{ marginTop: 12, border: '1px solid #faad14', background: '#fffbe6' }}>
          <Space>
            <TableOutlined style={{ color: '#faad14', fontSize: 20 }} />
            <div>
              <Text strong>数据查询完成</Text>
              <div style={{ fontSize: 12, color: '#666' }}>模型: {actionValue}</div>
            </div>
            <Button size="small" onClick={() => navigate(`/app/data/${actionValue}`)}>
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

  // 发送消息处理函数 (流式)
  const handleSend = async () => {
    if (!input.trim()) return;

    // 1. 构建用户消息
    const userMessage: Message = {
      role: 'user',
      content: input,
      displayContent: input,
      timestamp: new Date()
    };

    // 2. 预先构建一个空的 AI 消息占位
    const assistantMessage: Message = {
      role: 'assistant',
      content: '', // 初始为空
      displayContent: '',
      timestamp: new Date(),
      agentType: 'AUTO'
    };

    // 更新 UI，清空输入框
    setMessages(prev => [...prev, userMessage, assistantMessage]);
    const currentInput = input; // 暂存 input 用于发送请求
    setInput('');
    setLoading(true);

    // 3. 准备 AbortController 用于取消请求
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {

      // 4. 发起 SSE 请求
      await fetchSSE({
        url: '/api/agent/stream', 
        token: accessToken || '',
        body: {
          input: currentInput,
          tenantId: user?.tenantId || ''
        },
        signal: abortController.signal,
        onMessage: (chunk) => {
          // 收到新片段，更新最后一条消息 (即 assistantMessage)
          setMessages(prev => {
            const newMessages = [...prev];
            const lastMsg = newMessages[newMessages.length - 1];
            
            if (lastMsg.role === 'assistant') {
              const newContent = lastMsg.content + chunk;
              // 更新内容并重新解析 Action 标签
              return [
                ...newMessages.slice(0, -1),
                {
                  ...lastMsg,
                  content: newContent,
                  displayContent: parseMessageContent(newContent)
                }
              ];
            }
            return prev;
          });
        },
        onDone: () => {
          setLoading(false);
          abortControllerRef.current = null;
        },
        onError: (err) => {
          console.error('SSE Error:', err);
          message.error('回答生成中断或出错');
          setLoading(false);
        }
      });

    } catch (error) {
      console.error('Request failed:', error);
      message.error('发送请求失败');
      setLoading(false);
    }
  };

  // 停止生成
  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setLoading(false);
      message.info('已停止生成');
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
                  renderItem={(msg, index) => (
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
                            {/* 只有当消息是助手发的，且不在加载中（已完成）时，才显示耗时(如果后端返回了的话) */}
                            {msg.role === 'assistant' && !loading && index === messages.length - 1 && msg.executionTime && (
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
                            {/* 如果是最后一条消息且正在加载，显示光标 */}
                            {loading && msg.role === 'assistant' && index === messages.length - 1 && (
                               <span style={{ display: 'inline-block', width: 8, height: 14, background: '#1890ff', marginLeft: 4, verticalAlign: 'middle', animation: 'blink 1s step-end infinite' }} />
                            )}
                          </div>
                        }
                      />
                    </List.Item>
                  )}
                />
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
                disabled={loading} // 加载时禁用输入框防止冲突，或者允许排队（这里先禁用简单处理）
              />
              {loading ? (
                <Button
                  danger // 红色按钮
                  icon={<StopOutlined />}
                  onClick={handleStop}
                  style={{ height: 'auto' }}
                  size="large"
                >
                  停止
                </Button>
              ) : (
                <Button
                  type="primary"
                  icon={<SendOutlined />}
                  onClick={handleSend}
                  loading={false} // 这里的 loading 状态我们通过按钮切换来控制
                  style={{ height: 'auto' }}
                  size="large"
                >
                  发送
                </Button>
              )}
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
      <style>{`
        @keyframes blink {
          50% { opacity: 0; }
        }
      `}</style>
    </div>
  );
};

export default AgentPage;