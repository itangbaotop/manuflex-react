import React, { useState, useEffect } from 'react';
import { Table, Button, Space, message, Modal, Form, Input, Select, Tag, Drawer, Card, Descriptions } from 'antd';
import { PlayCircleOutlined, EyeOutlined } from '@ant-design/icons';
import ProcessMonitor from '../../components/workflow/ProcessMonitor';
import { useAuth } from '../../context/AuthContext';
import { 
  getProcessInstances, 
  startProcess, 
  getProcessDefinitions,
  type ProcessInstance,
  type ProcessDefinition 
} from '../../api/workflow';

const ProcessInstancePage: React.FC = () => {
  const [instances, setInstances] = useState<ProcessInstance[]>([]);
  const [definitions, setDefinitions] = useState<ProcessDefinition[]>([]);
  const [loading, setLoading] = useState(false);
  const [startModalVisible, setStartModalVisible] = useState(false);
  const [monitorVisible, setMonitorVisible] = useState(false);
  const [selectedInstance, setSelectedInstance] = useState<ProcessInstance | null>(null);
  const [showFinished, setShowFinished] = useState(true);
  const [form] = Form.useForm();
  const { getAuthenticatedAxios } = useAuth();

  const loadInstances = async () => {
    setLoading(true);
    try {
      const axios = getAuthenticatedAxios();
      const response = await getProcessInstances(axios, { includeFinished: showFinished });
      console.log('Loaded instances:', response.data);
      setInstances(response.data);
    } catch (error) {
      message.error('加载流程实例失败');
    } finally {
      setLoading(false);
    }
  };

  const loadDefinitions = async () => {
    try {
      const axios = getAuthenticatedAxios();
      const response = await getProcessDefinitions(axios);
      console.log('Loaded definitions:', response.data);
      setDefinitions(response.data);
    } catch (error) {
      message.error('加载流程定义失败');
    }
  };

  useEffect(() => {
    const init = async () => {
      await loadDefinitions();
      await loadInstances();
    };
    init();
  }, [showFinished]);

  const handleStartProcess = async (values: any) => {
    try {
      const axios = getAuthenticatedAxios();
      const variables = values.variables ? JSON.parse(values.variables) : {};
      variables.initiator = 'admin';
      
      console.log('Starting process with:', { 
        processDefinitionKey: values.processDefinitionKey, 
        variables 
      });
      
      const response = await startProcess(axios, {
        processDefinitionKey: values.processDefinitionKey,
        businessKey: values.businessKey,
        variables
      });
      
      console.log('Process started:', response.data);
      message.success('流程启动成功');
      setStartModalVisible(false);
      form.resetFields();
      setTimeout(() => loadInstances(), 500);
    } catch (error: any) {
      console.error('Start process error:', error);
      message.error('流程启动失败: ' + (error.response?.data?.message || error.message));
    }
  };

  const columns = [
    {
      title: '流程名称',
      dataIndex: 'processDefinitionId',
      key: 'processDefinitionName',
      render: (processDefinitionId: string, record: ProcessInstance) => {
        const def = definitions.find(d => d.id === processDefinitionId);
        return def?.name || record.processDefinitionKey;
      },
    },
    {
      title: '版本',
      dataIndex: 'processDefinitionId',
      key: 'version',
      width: 80,
      render: (processDefinitionId: string) => {
        const def = definitions.find(d => d.id === processDefinitionId);
        return def ? `v${def.version}` : '-';
      },
    },
    {
      title: '业务Key',
      dataIndex: 'businessKey',
      key: 'businessKey',
      width: 150,
    },
    {
      title: '状态',
      dataIndex: 'suspended',
      key: 'suspended',
      width: 100,
      render: (suspended: boolean, record: ProcessInstance) => {
        if (record.endTime) return <Tag color="default">已结束</Tag>;
        return suspended ? <Tag color="orange">已暂停</Tag> : <Tag color="green">运行中</Tag>;
      },
    },
    {
      title: '开始时间',
      dataIndex: 'startTime',
      key: 'startTime',
      width: 180,
      render: (date: string) => new Date(date).toLocaleString(),
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record: ProcessInstance) => (
        <Space>
          <Button 
            size="small" 
            icon={<EyeOutlined />}
            onClick={() => {
              setSelectedInstance(record);
              setMonitorVisible(true);
            }}
          >
            监控
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <Button 
          type="primary" 
          icon={<PlayCircleOutlined />}
          onClick={() => setStartModalVisible(true)}
        >
          启动流程
        </Button>
        <Space>
          <span>显示已完成流程:</span>
          <Select value={showFinished} onChange={setShowFinished} style={{ width: 100 }}>
            <Select.Option value={true}>是</Select.Option>
            <Select.Option value={false}>否</Select.Option>
          </Select>
        </Space>
      </div>

      <Table
        columns={columns}
        dataSource={instances}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 10 }}
      />

      <Modal
        title="启动流程"
        open={startModalVisible}
        onCancel={() => {
          setStartModalVisible(false);
          form.resetFields();
        }}
        footer={null}
      >
        <Form form={form} onFinish={handleStartProcess} layout="vertical">
          <Form.Item 
            label="流程定义" 
            name="processDefinitionKey"
            rules={[{ required: true, message: '请选择流程定义' }]}
          >
            <Select placeholder="请选择流程定义">
              {definitions.map(def => (
                <Select.Option key={def.key} value={def.key}>
                  {def.name} (v{def.version})
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          
          <Form.Item label="业务Key" name="businessKey">
            <Input placeholder="可选，用于关联业务数据" />
          </Form.Item>

          <Form.Item label="流程变量（JSON格式）" name="variables">
            <Input.TextArea 
              rows={4} 
              placeholder='例如: {"amount": 1000, "applicant": "张三"}'
            />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                启动
              </Button>
              <Button onClick={() => setStartModalVisible(false)}>
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      <Drawer
        title="流程监控"
        width="80%"
        open={monitorVisible}
        onClose={() => setMonitorVisible(false)}
        destroyOnClose
      >
        {selectedInstance && (
          <div>
            <Card style={{ marginBottom: 16 }}>
              <Descriptions column={2}>
                <Descriptions.Item label="流程实例ID">{selectedInstance.id}</Descriptions.Item>
                <Descriptions.Item label="状态">
                  {selectedInstance.endTime ? (
                    <Tag color="default">已结束</Tag>
                  ) : (
                    <Tag color="green">运行中</Tag>
                  )}
                </Descriptions.Item>
                <Descriptions.Item label="开始时间">
                  {new Date(selectedInstance.startTime).toLocaleString()}
                </Descriptions.Item>
                {selectedInstance.endTime && (
                  <Descriptions.Item label="结束时间">
                    {new Date(selectedInstance.endTime).toLocaleString()}
                  </Descriptions.Item>
                )}
              </Descriptions>
            </Card>
            <ProcessMonitor
              processInstanceId={selectedInstance.id}
              processDefinitionId={selectedInstance.processDefinitionId}
            />
          </div>
        )}
      </Drawer>
    </div>
  );
};

export default ProcessInstancePage;