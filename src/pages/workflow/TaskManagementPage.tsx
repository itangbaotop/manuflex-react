import React from 'react';
import { Card } from 'antd';
import TaskList from '../../components/workflow/TaskList';

const TaskManagementPage: React.FC = () => {
  return (
    <Card title="我的任务" style={{ height: '100%' }}>
      <TaskList />
    </Card>
  );
};

export default TaskManagementPage;