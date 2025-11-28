import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, Input, Button, Checkbox, Card, Typography, message, Layout, theme } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useAuth } from '../context/AuthContext';

const { Title, Text } = Typography;
const { Content } = Layout;

const LoginPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const { token: { colorPrimary } } = theme.useToken();

  const onFinish = async (values: any) => {
    setLoading(true);
    try {
      await login(values.username, values.password);
      message.success('登录成功，欢迎回来！');
      navigate('/dashboard');
    } catch (err: any) {
      const msg = err.response?.data?.message || '登录失败，请检查用户名或密码';
      message.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout style={{ minHeight: '100vh', background: '#f0f2f5' }}>
      <Content style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <Card 
          style={{ width: 400, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
          bordered={false}
        >
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div style={{ 
                width: 48, height: 48, background: colorPrimary, borderRadius: 8, 
                margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
                {/* 简单的 Logo 占位 */}
                <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                    <path d="M12 2L2 7l10 5 10-5-10-5zm0 9l2.5-1.25L12 8.5l-2.5 1.25L12 11zm0 2.5l-5-2.5-5 2.5L12 22l10-8.5-5-2.5-5 2.5z"/>
                </svg>
            </div>
            <Title level={3} style={{ marginBottom: 8 }}>ManuFlex PaaS</Title>
            <Text type="secondary">企业级无代码业务平台</Text>
          </div>

          <Form
            name="login"
            initialValues={{ remember: true }}
            onFinish={onFinish}
            size="large"
          >
            <Form.Item
              name="username"
              rules={[{ required: true, message: '请输入用户名或邮箱' }]}
            >
              <Input prefix={<UserOutlined />} placeholder="用户名 / 邮箱" />
            </Form.Item>

            <Form.Item
              name="password"
              rules={[{ required: true, message: '请输入密码' }]}
            >
              <Input.Password prefix={<LockOutlined />} placeholder="密码" />
            </Form.Item>

            <Form.Item>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Form.Item name="remember" valuePropName="checked" noStyle>
                  <Checkbox>记住我</Checkbox>
                </Form.Item>
                <a style={{ fontSize: 14 }} onClick={(e) => e.preventDefault()}>忘记密码？</a>
              </div>
            </Form.Item>

            <Form.Item>
              <Button type="primary" htmlType="submit" loading={loading} block>
                登 录
              </Button>
            </Form.Item>
            
            <div style={{ textAlign: 'center', fontSize: 14 }}>
               没有账号？ <a onClick={() => message.info("请联系管理员开通账号")}>联系管理员</a>
            </div>
          </Form>
        </Card>
      </Content>
    </Layout>
  );
};

export default LoginPage;