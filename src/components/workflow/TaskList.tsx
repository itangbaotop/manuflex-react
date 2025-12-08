import React, { useState, useEffect } from 'react';
import { Table, Button, Space, Tag, message, Modal, Form, Input, Card, Select } from 'antd';
import { CheckOutlined, UserOutlined } from '@ant-design/icons';
import { useAuth } from '../../context/AuthContext';
import { getTasks, completeTask, claimTask, type Task } from '../../api/workflow';
import { getFormDefinition } from '../../api/form';
import FormRenderer from './FormRenderer';

const TaskList: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [completeModalVisible, setCompleteModalVisible] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [form] = Form.useForm();
  const { user, getAuthenticatedAxios } = useAuth();

  const loadTasks = async () => {
    setLoading(true);
    try {
      const axios = getAuthenticatedAxios();
      console.log('Loading tasks for user:', user?.username);
      const response = await getTasks(axios, { assignee: user?.username });
      console.log('Tasks loaded:', response.data);
      setTasks(response.data);
    } catch (error: any) {
      console.error('Load tasks error:', error);
      message.error('加载任务失败: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, []);

  const handleClaim = async (task: Task) => {
    try {
      const axios = getAuthenticatedAxios();
      await claimTask(axios, task.id, user?.username || '');
      message.success('认领成功');
      loadTasks();
    } catch (error) {
      message.error('认领失败');
    }
  };

  const handleComplete = async (values: any) => {
    if (!selectedTask) return;
    
    try {
      const axios = getAuthenticatedAxios();
      await completeTask(axios, selectedTask.id, values);
      message.success('任务完成');
      setCompleteModalVisible(false);
      form.resetFields();
      setSelectedTask(null);
      loadTasks();
    } catch (error) {
      message.error('完成任务失败');
    }
  };

  const openCompleteModal = async (task: Task) => {
    setSelectedTask(task);
    
    // 加载业务数据
    if (task.variables?.schemaName && task.variables?.dataId) {
      try {
        const axios = getAuthenticatedAxios();
        const dataResponse = await axios.get(`/api/data/${task.variables.schemaName}/${task.variables.dataId}`);
        setSelectedTask(prev => ({ ...prev!, variables: { ...prev!.variables, businessData: dataResponse.data } }));
      } catch (error) {
        console.error('加载业务数据失败:', error);
      }
    }
    
    if (task.formKey) {
      try {
        const axios = getAuthenticatedAxios();
        const response = await getFormDefinition(axios, task.formKey);
        const parsed = typeof response.data.schema === 'string' ? JSON.parse(response.data.schema) : response.data.schema;
        setSelectedTask(prev => ({ ...prev!, formSchema: parsed }));
      } catch (error) {
        console.error('加载表单失败:', error);
      }
    }
    setCompleteModalVisible(true);
  };

  const columns = [
    {
      title: '任务名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '流程实例ID',
      dataIndex: 'processInstanceId',
      key: 'processInstanceId',
    },
    {
      title: '分配人',
      dataIndex: 'assignee',
      key: 'assignee',
      render: (assignee: string) => assignee || <Tag color="orange">未分配</Tag>,
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => new Date(date).toLocaleString(),
    },
    {
      title: '到期时间',
      dataIndex: 'dueDate',
      key: 'dueDate',
      render: (date: string) => date ? new Date(date).toLocaleString() : '-',
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record: Task) => (
        <Space>
          {!record.assignee && (
            <Button 
              size="small" 
              icon={<UserOutlined />}
              onClick={() => handleClaim(record)}
            >
              认领
            </Button>
          )}
          {record.assignee === user?.username && (
            <Button 
              type="primary" 
              size="small" 
              icon={<CheckOutlined />}
              onClick={() => openCompleteModal(record)}
            >
              完成
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Table
        columns={columns}
        dataSource={tasks}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 10 }}
      />

      <Modal
        title="完成任务"
        open={completeModalVisible}
        onCancel={() => {
          setCompleteModalVisible(false);
          form.resetFields();
          setSelectedTask(null);
        }}
        footer={null}
        width={selectedTask?.formSchema ? 800 : 520}
      >
        {selectedTask?.variables?.businessData && (
          <Card title="业务数据" size="small" style={{ marginBottom: 16 }}>
            <pre style={{ maxHeight: 200, overflow: 'auto', background: '#f5f5f5', padding: 8 }}>
              {JSON.stringify(selectedTask.variables.businessData, null, 2)}
            </pre>
          </Card>
        )}
        {selectedTask?.formSchema ? (
          <FormRenderer
            schema={selectedTask.formSchema}
            initialValues={selectedTask.variables}
            onSubmit={handleComplete}
            onCancel={() => setCompleteModalVisible(false)}
          />
        ) : (
          <Form form={form} onFinish={handleComplete} layout="vertical">
            <Form.Item label="审批意见" name="comment">
              <Input.TextArea rows={4} placeholder="请输入审批意见" />
            </Form.Item>
            <Form.Item label="审批结果" name="approved" rules={[{ required: true }]}>
              <Select placeholder="请选择">
                <Select.Option value={true}>通过</Select.Option>
                <Select.Option value={false}>拒绝</Select.Option>
              </Select>
            </Form.Item>
            <Form.Item>
              <Space>
                <Button type="primary" htmlType="submit">
                  完成任务
                </Button>
                <Button onClick={() => setCompleteModalVisible(false)}>
                  取消
                </Button>
              </Space>
            </Form.Item>
          </Form>
        )}
      </Modal>
    </div>
  );
};

export default TaskList;