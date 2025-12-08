import React, { useState, useEffect } from 'react';
import { Table, Button, Space, message, Modal, Tag } from 'antd';
import { PlusOutlined, PlayCircleOutlined, EyeOutlined } from '@ant-design/icons';
import { useAuth } from '../../context/AuthContext';
import FormJsRenderer from '../../components/workflow/FormJsRenderer';

interface BusinessDataPageProps {
  schemaName: string;
  schemaConfig?: {
    workflowEnabled?: boolean;
    workflowProcessKey?: string;
    workflowFormKey?: string;
  };
}

const BusinessDataPage: React.FC<BusinessDataPageProps> = ({ schemaName, schemaConfig }) => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [formVisible, setFormVisible] = useState(false);
  const [formSchema, setFormSchema] = useState<any>(null);
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const { getAuthenticatedAxios } = useAuth();

  const loadData = async () => {
    setLoading(true);
    try {
      const axios = getAuthenticatedAxios();
      const response = await axios.get(`/api/data/${schemaName}`);
      setData(response.data);
    } catch (error) {
      message.error('加载数据失败');
    } finally {
      setLoading(false);
    }
  };

  const loadFormSchema = async () => {
    if (!schemaConfig?.workflowFormKey) return;
    try {
      const axios = getAuthenticatedAxios();
      const response = await axios.get(`/api/workflow/forms/definitions/${schemaConfig.workflowFormKey}`);
      const parsed = typeof response.data.schema === 'string' ? JSON.parse(response.data.schema) : response.data.schema;
      setFormSchema(parsed);
    } catch (error) {
      message.error('加载表单失败');
    }
  };

  useEffect(() => {
    loadData();
    loadFormSchema();
  }, [schemaName]);

  const handleStartWorkflow = async (record: any) => {
    setSelectedRecord(record);
    setFormVisible(true);
  };

  const handleSubmitWorkflow = async (formData: any) => {
    try {
      const axios = getAuthenticatedAxios();
      
      let dataId = selectedRecord?.id;
      if (!dataId) {
        const createResponse = await axios.post(`/api/data/${schemaName}`, formData);
        dataId = createResponse.data.id;
      }
      
      await axios.post(`/api/data/${schemaName}/${dataId}/start-workflow`, {
        processKey: schemaConfig?.workflowProcessKey
      });
      
      message.success('流程启动成功');
      setFormVisible(false);
      setSelectedRecord(null);
      loadData();
    } catch (error: any) {
      message.error('启动流程失败: ' + (error.response?.data?.message || error.message));
    }
  };

  const columns = [
    { title: 'ID', dataIndex: 'id', key: 'id', width: 80 },
    {
      title: '状态',
      dataIndex: 'workflowStatus',
      key: 'workflowStatus',
      width: 120,
      render: (status: string) => {
        const map: any = {
          'DRAFT': { color: 'default', text: '草稿' },
          'IN_PROGRESS': { color: 'processing', text: '审批中' },
          'APPROVED': { color: 'success', text: '已通过' },
          'REJECTED': { color: 'error', text: '已拒绝' },
        };
        const config = map[status] || { color: 'default', text: '草稿' };
        return <Tag color={config.color}>{config.text}</Tag>;
      },
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: any) => (
        <Space>
          {schemaConfig?.workflowEnabled && !record.processInstanceId && (
            <Button size="small" type="primary" icon={<PlayCircleOutlined />} onClick={() => handleStartWorkflow(record)}>
              发起流程
            </Button>
          )}
          {record.processInstanceId && (
            <Button size="small" icon={<EyeOutlined />}>查看流程</Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        {schemaConfig?.workflowEnabled && (
          <Button type="primary" icon={<PlusOutlined />} onClick={() => { setSelectedRecord(null); setFormVisible(true); }}>
            新建并发起流程
          </Button>
        )}
      </div>
      <Table columns={columns} dataSource={data} rowKey="id" loading={loading} pagination={{ pageSize: 10 }} />
      <Modal title="发起流程" width="60%" open={formVisible} onCancel={() => setFormVisible(false)} footer={null} destroyOnClose>
        {formSchema && <FormJsRenderer schema={formSchema} initialData={selectedRecord} onSubmit={handleSubmitWorkflow} onCancel={() => setFormVisible(false)} />}
      </Modal>
    </div>
  );
};

export default BusinessDataPage;
