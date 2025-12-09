import React, { useEffect, useState } from 'react';
import { Card, Row, Col, Statistic, Button, Typography, Space, Avatar } from 'antd';
import { 
  DatabaseOutlined, 
  FileTextOutlined, 
  CheckCircleOutlined, 
  ClockCircleOutlined,
  RocketOutlined,
  SettingOutlined,
  UserOutlined,
  ArrowUpOutlined
} from '@ant-design/icons';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const { Title, Text } = Typography;

const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats] = useState({
    totalModels: 12,
    totalRecords: 1580,
    pendingTasks: 8,
    completedToday: 23
  });

  const quickActions = [
    { title: '元数据管理', icon: <DatabaseOutlined />, path: '/system/metadata', color: '#1890ff' },
    { title: '流程设计', icon: <RocketOutlined />, path: '/workflow/designer', color: '#52c41a' },
    { title: '表单管理', icon: <FileTextOutlined />, path: '/workflow/forms', color: '#faad14' },
    { title: '任务中心', icon: <CheckCircleOutlined />, path: '/workflow/tasks', color: '#722ed1' },
  ];

  return (
    <div style={{ padding: 24, background: '#f0f2f5', minHeight: 'calc(100vh - 64px)' }}>
      {/* 欢迎区域 */}
      <Card bordered={false} style={{ marginBottom: 24, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
        <Row align="middle">
          <Col flex="auto">
            <Space size="large">
              <Avatar size={64} icon={<UserOutlined />} style={{ backgroundColor: '#fff', color: '#667eea' }} />
              <div>
                <Title level={3} style={{ color: '#fff', margin: 0 }}>
                  欢迎回来, {user?.username}!
                </Title>
                <Text style={{ color: 'rgba(255,255,255,0.85)' }}>
                  租户: {user?.tenantId} | 角色: {user?.roles?.join(', ') || '普通用户'}
                </Text>
              </div>
            </Space>
          </Col>
          <Col>
            <Button 
              type="primary" 
              size="large" 
              icon={<SettingOutlined />}
              style={{ background: 'rgba(255,255,255,0.2)', border: 'none' }}
              onClick={() => navigate('/system/metadata')}
            >
              快速开始
            </Button>
          </Col>
        </Row>
      </Card>

      {/* 统计卡片 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} hoverable>
            <Statistic
              title="业务模型"
              value={stats.totalModels}
              prefix={<DatabaseOutlined style={{ color: '#1890ff' }} />}
              suffix="个"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} hoverable>
            <Statistic
              title="总记录数"
              value={stats.totalRecords}
              prefix={<FileTextOutlined style={{ color: '#52c41a' }} />}
              suffix="条"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} hoverable>
            <Statistic
              title="待办任务"
              value={stats.pendingTasks}
              prefix={<ClockCircleOutlined style={{ color: '#faad14' }} />}
              suffix="个"
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} hoverable>
            <Statistic
              title="今日完成"
              value={stats.completedToday}
              prefix={<CheckCircleOutlined style={{ color: '#722ed1' }} />}
              suffix="个"
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 快捷入口 */}
      <Card title="快捷入口" bordered={false}>
        <Row gutter={[16, 16]}>
          {quickActions.map((action, index) => (
            <Col xs={24} sm={12} md={6} key={index}>
              <Card
                hoverable
                onClick={() => navigate(action.path)}
                style={{ textAlign: 'center', borderRadius: 8 }}
                bodyStyle={{ padding: '32px 16px' }}
              >
                <div style={{ fontSize: 48, color: action.color, marginBottom: 16 }}>
                  {action.icon}
                </div>
                <Title level={5} style={{ margin: 0 }}>{action.title}</Title>
              </Card>
            </Col>
          ))}
        </Row>
      </Card>
    </div>
  );
};

export default DashboardPage;
