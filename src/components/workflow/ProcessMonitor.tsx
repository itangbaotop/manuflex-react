import React, { useState, useEffect } from 'react';
import { Card, Descriptions, Tag, Timeline, Spin, message } from 'antd';
import { ClockCircleOutlined, CheckCircleOutlined } from '@ant-design/icons';
import ProcessViewer from './ProcessViewer';
import { useAuth } from '../../context/AuthContext';
import { getProcessDefinitionXml } from '../../api/workflow';

interface ProcessMonitorProps {
  processInstanceId: string;
  processDefinitionId: string;
  currentActivityIds?: string[];
  completedActivityIds?: string[];
}

const ProcessMonitor: React.FC<ProcessMonitorProps> = ({
  processInstanceId,
  processDefinitionId,
  currentActivityIds = [],
  completedActivityIds = []
}) => {
  const [xml, setXml] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [activeActivities, setActiveActivities] = useState<string[]>([]);
  const { getAuthenticatedAxios } = useAuth();

  useEffect(() => {
    loadProcessXml();
    loadActiveActivities();
  }, [processDefinitionId, processInstanceId]);

  const loadActiveActivities = async () => {
    try {
      const axios = getAuthenticatedAxios();
      const response = await axios.get(`/api/workflow/process-instances/${processInstanceId}/activities`);
      console.log('Active activities:', response.data);
      setActiveActivities(response.data || []);
    } catch (error) {
      console.error('加载活动节点失败:', error);
    }
  };

  const loadProcessXml = async () => {
    setLoading(true);
    try {
      const axios = getAuthenticatedAxios();
      const response = await getProcessDefinitionXml(axios, processDefinitionId);
      setXml(response.data.xml);
    } catch (error) {
      console.error('加载流程图失败:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <Spin />;
  }

  return (
    <div>
      <Card title="流程图" style={{ marginBottom: 16 }}>
        {xml && (
          <ProcessViewer 
            xml={xml} 
            highlightedElements={[...currentActivityIds, ...completedActivityIds]} 
          />
        )}
      </Card>

      <Card title="当前节点">
        {(currentActivityIds.length > 0 || activeActivities.length > 0) ? (
          <Timeline>
            {[...currentActivityIds, ...activeActivities].map(id => (
              <Timeline.Item 
                key={id} 
                dot={<ClockCircleOutlined style={{ fontSize: '16px' }} />}
                color="blue"
              >
                <Tag color="processing">{id}</Tag> 进行中
              </Timeline.Item>
            ))}
          </Timeline>
        ) : (
          <Tag color="success">流程已完成</Tag>
        )}
      </Card>
    </div>
  );
};

export default ProcessMonitor;