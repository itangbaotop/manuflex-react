import React, { useState } from 'react';
import { Card, Button, Input, Space, message, Typography } from 'antd';
import { useAuth } from '../../context/AuthContext';
import { executeAgent } from '../../api/agent';

const { TextArea } = Input;
const { Title, Paragraph } = Typography;

const AgentTestPage: React.FC = () => {
  const { user, getAuthenticatedAxios } = useAuth();
  const [input, setInput] = useState('');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const testCases = [
    {
      title: '表单生成测试',
      input: '创建一个产品管理表单，包含产品名称、规格、价格、库存数量等字段'
    },
    {
      title: '工作流测试', 
      input: '设计一个产品质量检测流程，包含样品接收、检测、审核、报告生成等步骤'
    },
    {
      title: '数据分析测试',
      input: '分析生产数据，统计每月产量趋势和合格率变化'
    },
    {
      title: '通用问答测试',
      input: '如何在平台中创建新的数据模型？'
    }
  ];

  const handleTest = async (testInput?: string) => {
    const inputText = testInput || input;
    if (!inputText.trim()) {
      message.warning('请输入测试内容');
      return;
    }

    setLoading(true);
    try {
      const axios = getAuthenticatedAxios();
      const response = await executeAgent(axios, inputText, user?.tenantId || '');
      setResult(response);
      
      if (response.success) {
        message.success('执行成功');
      } else {
        message.error('执行失败');
      }
    } catch (error) {
      message.error('请求失败');
      setResult({ success: false, error: '网络错误' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 24 }}>
      <Title level={2}>Agent 功能测试</Title>
      
      <Card title="快速测试用例" style={{ marginBottom: 24 }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          {testCases.map((testCase, index) => (
            <Card key={index} size="small" style={{ backgroundColor: '#f9f9f9' }}>
              <Paragraph strong>{testCase.title}</Paragraph>
              <Paragraph>{testCase.input}</Paragraph>
              <Button 
                type="primary" 
                size="small"
                loading={loading}
                onClick={() => handleTest(testCase.input)}
              >
                测试
              </Button>
            </Card>
          ))}
        </Space>
      </Card>

      <Card title="自定义测试">
        <Space direction="vertical" style={{ width: '100%' }}>
          <TextArea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="输入您的测试内容..."
            rows={4}
          />
          <Button 
            type="primary" 
            loading={loading}
            onClick={() => handleTest()}
          >
            执行测试
          </Button>
        </Space>
      </Card>

      {result && (
        <Card title="执行结果" style={{ marginTop: 24 }}>
          <Space direction="vertical" style={{ width: '100%' }}>
            <div>
              <strong>状态:</strong> 
              <span style={{ color: result.success ? 'green' : 'red' }}>
                {result.success ? '成功' : '失败'}
              </span>
            </div>
            {result.executionTime && (
              <div><strong>执行时间:</strong> {result.executionTime}ms</div>
            )}
            {result.message && (
              <div><strong>消息:</strong> {result.message}</div>
            )}
            {result.error && (
              <div><strong>错误:</strong> <span style={{ color: 'red' }}>{result.error}</span></div>
            )}
            {result.data && (
              <div>
                <strong>数据:</strong>
                <pre style={{ 
                  background: '#f5f5f5', 
                  padding: 16, 
                  borderRadius: 4,
                  overflow: 'auto',
                  maxHeight: 400
                }}>
                  {JSON.stringify(result.data, null, 2)}
                </pre>
              </div>
            )}
          </Space>
        </Card>
      )}
    </div>
  );
};

export default AgentTestPage;