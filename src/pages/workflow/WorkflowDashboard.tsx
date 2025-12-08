import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Statistic, List, Tag } from 'antd';
import { ClockCircleOutlined, CheckCircleOutlined, PlayCircleOutlined, FileTextOutlined } from '@ant-design/icons';
import { useAuth } from '../../context/AuthContext';
import { getTasks, getProcessInstances } from '../../api/workflow';
import QuickStartProcess from '../../components/workflow/QuickStartProcess';

const WorkflowDashboard: React.FC = () => {
  const [stats, setStats] = useState({
    myTasks: 0,
    runningInstances: 0,
    completedToday: 0
  });
  const [recentTasks, setRecentTasks] = useState<any[]>([]);
  const { user, getAuthenticatedAxios } = useAuth();

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const axios = getAuthenticatedAxios();
      
      const tasksResponse = await getTasks(axios, { assignee: user?.username });
      const instancesResponse = await getProcessInstances(axios);
      
      const runningInstances = instancesResponse.data.filter(i => !i.endTime);
      
      setStats({
        myTasks: tasksResponse.data.length,
        runningInstances: runningInstances.length,
        completedToday: 0
      });
      
      setRecentTasks(tasksResponse.data.slice(0, 5));
    } catch (error) {
      console.error('加载仪表板数据失败:', error);
    }
  };

  return (
    <div>
      <Row gutter={[16, 16]}>
        <Col span={6}>
          <Card>
            <Statistic
              title="我的待办任务"
              value={stats.myTasks}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="运行中的流程"
              value={stats.runningInstances}
              prefix={<PlayCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="今日完成"
              value={stats.completedToday}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="流程定义"
              value={0}
              prefix={<FileTextOutlined />}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col span={12}>
          <Card title="最近任务">
            <List
              dataSource={recentTasks}
              renderItem={item => (
                <List.Item>
                  <List.Item.Meta
                    title={item.name}
                    description={`流程实例: ${item.processInstanceId}`}
                  />
                  <Tag color="blue">待处理</Tag>
                </List.Item>
              )}
            />
          </Card>
        </Col>
        <Col span={12}>
          <QuickStartProcess />
        </Col>
      </Row>
    </div>
  );
};

export default WorkflowDashboard;