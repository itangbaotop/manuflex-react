import React, { useState, useEffect, useRef } from 'react';
import { Card, Input, Button, List, Avatar, Spin, Row, Col, Tag, Space, message, Typography, Upload } from 'antd';
import { 
  SendOutlined, 
  RobotOutlined, 
  UserOutlined, 
  ThunderboltOutlined, 
  FormOutlined, 
  RocketOutlined, 
  TableOutlined,
  StopOutlined, // 新增停止图标
  DeleteOutlined,
  PictureOutlined
} from '@ant-design/icons';
import { useAuth } from '../../context/AuthContext';
import { getAgents, type AgentInfo } from '../../api/agent'; 
import { useNavigate } from 'react-router-dom';
import { fetchSSE } from '../../utils/sseUtils'; // 引入 SSE 工具函数
import type { UploadFile } from 'antd/lib/upload/interface';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

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

  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  
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

  const MarkdownRenderer: React.FC<{ content: string }> = ({ content }) => {
    return (
      <div className="markdown-body" style={{ fontSize: '14px', lineHeight: '1.6' }}>
        <ReactMarkdown
          remarkPlugins={[remarkGfm]} // 支持表格、删除线等
          components={{
            // 自定义代码块渲染
            code({node, inline, className, children, ...props}: any) {
              const match = /language-(\w+)/.exec(className || '');
              return !inline && match ? (
                <SyntaxHighlighter
                  style={vscDarkPlus} // 使用 VSCode 深色主题
                  language={match[1]}
                  PreTag="div"
                  {...props}
                >
                  {String(children).replace(/\n$/, '')}
                </SyntaxHighlighter>
              ) : (
                <code className={className} {...props} style={{ background: '#f0f0f0', padding: '2px 4px', borderRadius: 4, color: '#c7254e' }}>
                  {children}
                </code>
              );
            },
            // 自定义表格样式 (Ant Design 风格)
            table: ({node, ...props}) => <table style={{ borderCollapse: 'collapse', width: '100%', marginBottom: 16, border: '1px solid #e8e8e8' }} {...props} />,
            th: ({node, ...props}) => <th style={{ background: '#fafafa', padding: '12px 8px', borderBottom: '1px solid #e8e8e8', textAlign: 'left', fontWeight: 600 }} {...props} />,
            td: ({node, ...props}) => <td style={{ padding: '12px 8px', borderBottom: '1px solid #e8e8e8' }} {...props} />,
            // 自定义链接颜色
            a: ({node, ...props}) => <a style={{ color: '#1890ff' }} {...props} />,
            // 段落间距
            p: ({node, ...props}) => <p style={{ marginBottom: '0.8em' }} {...props} />,
            // 列表缩进
            ul: ({node, ...props}) => <ul style={{ paddingLeft: 24, marginBottom: 16 }} {...props} />,
            ol: ({node, ...props}) => <ol style={{ paddingLeft: 24, marginBottom: 16 }} {...props} />,
          }}
        >
          {content}
        </ReactMarkdown>
      </div>
    );
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
        <MarkdownRenderer content={cleanText} />
        {actionCard}
      </div>
    );
  };

  const handleImageChange = async (info: any) => {
    let newFileList = [...info.fileList];
    // 限制只上传一张，覆盖旧的
    newFileList = newFileList.slice(-1);
    setFileList(newFileList);

    if (newFileList.length > 0) {
      const file = newFileList[0].originFileObj;
      if (file) {
        // 校验图片大小 (例如限制 5MB)
        if (file.size > 5 * 1024 * 1024) {
            message.error('图片大小不能超过 5MB');
            setFileList([]);
            setImageBase64(null);
            return;
        }
        
        // 转 Base64
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
          // 结果格式: "data:image/png;base64,iVBORw0KGgo..."
          setImageBase64(reader.result as string);
        };
      }
    } else {
      setImageBase64(null);
    }
  };

  const handleRemoveImage = () => {
      setFileList([]);
      setImageBase64(null);
  };

  // 发送消息处理函数 (流式)
  const handleSend = async () => {
    if (!input.trim() && !imageBase64) return; // 既没文字也没图就不发

    // 构建显示内容：如果有图，在气泡里显示缩略图
    const displayContent = (
        <div>
            {imageBase64 && (
                <img 
                    src={imageBase64} 
                    alt="upload" 
                    style={{ maxWidth: '200px', maxHeight: '150px', display: 'block', marginBottom: 8, borderRadius: 4 }} 
                />
            )}
            {input}
        </div>
    );

    const userMessage: Message = {
      role: 'user',
      content: input, // 历史记录存文本
      displayContent: displayContent, // UI 显示带图
      timestamp: new Date()
    };

    const assistantMessage: Message = {
      role: 'assistant',
      content: '',
      displayContent: '',
      timestamp: new Date(),
      agentType: 'AUTO'
    };

    setMessages(prev => [...prev, userMessage, assistantMessage]);
    
    const currentInput = input;
    // 这里我们简单处理：传纯 Base64
    const cleanBase64 = imageBase64 ? imageBase64.split(',')[1] : null;

    setInput('');
    setFileList([]); // 发送后清空图片
    setImageBase64(null);
    setLoading(true);

    if (abortControllerRef.current) abortControllerRef.current.abort();
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      
      await fetchSSE({
        url: '/api/agent/stream',
        token: accessToken || '',
        body: {
          input: currentInput,
          image: cleanBase64, // 传递图片字段
          tenantId: user?.tenantId || ''
        },
        signal: abortController.signal,
        onMessage: (chunk) => {
           setMessages(prev => {
            const newMessages = [...prev];
            const lastMsg = newMessages[newMessages.length - 1];
            if (lastMsg.role === 'assistant') {
              const newContent = lastMsg.content + chunk;
              return [...newMessages.slice(0, -1), { ...lastMsg, content: newContent, displayContent: newContent }]; 
            }
            return prev;
          });
        },
        onDone: () => {
          setLoading(false);
          abortControllerRef.current = null;
        },
        onError: (err) => {
          console.error(err);
          setLoading(false);
          message.error('请求失败');
        }
      });
    } catch (e) {
       console.error(e);
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


          <Card style={{ marginTop: 16 }}>
            {fileList.length > 0 && (
                <div style={{ marginBottom: 8, padding: 8, background: '#fafafa', borderRadius: 4, display: 'inline-flex', alignItems: 'center' }}>
                    <span style={{ fontSize: 12, marginRight: 8 }}>已选择图片: {fileList[0].name}</span>
                    <Button type="text" size="small" icon={<DeleteOutlined />} onClick={handleRemoveImage} danger />
                </div>
            )}
              <Space.Compact style={{ width: '100%' }}>

                <Upload
                    fileList={fileList}
                    onChange={handleImageChange}
                    beforeUpload={() => false}
                    maxCount={1}
                    accept="image/*"
                    showUploadList={false} 
                >
                    <Button icon={<PictureOutlined />} style={{ height: '100%', borderRadius: '8px 0 0 8px' }} />
                </Upload>
                
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
                  disabled={loading} 
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
                    loading={loading && !abortControllerRef.current}
                    style={{ height: 'auto' }}
                    size="large"
                  >
                    发送
                  </Button>
                )}
              </Space.Compact>
            </Card>
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