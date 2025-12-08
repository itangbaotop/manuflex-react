import React, { useState, useEffect } from 'react';
import { Table, Button, Space, message, Modal, Drawer } from 'antd';
import { PlusOutlined, EditOutlined, EyeOutlined, DeleteOutlined } from '@ant-design/icons';
import { useAuth } from '../../context/AuthContext';
import { getProcessDefinitions, deployProcess, getProcessDefinitionXml, deleteDeployment, type ProcessDefinition } from '../../api/workflow';
import BpmnDesigner from '../../components/workflow/BpmnDesigner';
import ProcessViewer from '../../components/workflow/ProcessViewer';

const ProcessDefinitionPage: React.FC = () => {
  const [processes, setProcesses] = useState<ProcessDefinition[]>([]);
  const [loading, setLoading] = useState(false);
  const [designerVisible, setDesignerVisible] = useState(false);
  const [viewerVisible, setViewerVisible] = useState(false);
  const [selectedProcess, setSelectedProcess] = useState<ProcessDefinition | null>(null);
  const { getAuthenticatedAxios } = useAuth();

  const loadProcesses = async () => {
    setLoading(true);
    try {
      const axios = getAuthenticatedAxios();
      const response = await getProcessDefinitions(axios);
      setProcesses(response.data);
    } catch (error) {
      message.error('加载流程定义失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProcesses();
  }, []);

  const handleSave = async (xml: string, name: string) => {
    try {
      const axios = getAuthenticatedAxios();
      await deployProcess(axios, { name, xml });
      message.success('部署成功');
      setDesignerVisible(false);
      loadProcesses();
    } catch (error) {
      message.error('部署失败');
    }
  };

  const handleView = async (process: ProcessDefinition) => {
    try {
      const axios = getAuthenticatedAxios();
      const response = await getProcessDefinitionXml(axios, process.id);
      setSelectedProcess({ ...process, xml: response.data.xml });
      setViewerVisible(true);
    } catch (error) {
      message.error('加载XML失败');
    }
  };

  const columns = [
    {
      title: '流程名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '流程Key',
      dataIndex: 'key',
      key: 'key',
    },
    {
      title: '版本',
      dataIndex: 'version',
      key: 'version',
    },
    {
      title: '状态',
      dataIndex: 'suspended',
      key: 'suspended',
      render: (suspended: boolean) => suspended ? '已暂停' : '运行中',
    },
    {
      title: '部署时间',
      dataIndex: 'deploymentTime',
      key: 'deploymentTime',
      render: (date: string) => date ? new Date(date).toLocaleString() : '-',
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record: ProcessDefinition) => (
        <Space>
          <Button 
            size="small" 
            icon={<EyeOutlined />}
            onClick={() => handleView(record)}
          >
            查看
          </Button>
          <Button 
            size="small" 
            icon={<EditOutlined />}
            onClick={async () => {
              try {
                const axios = getAuthenticatedAxios();
                const response = await getProcessDefinitionXml(axios, record.id);
                setSelectedProcess({ ...record, xml: response.data.xml });
                setDesignerVisible(true);
              } catch (error) {
                message.error('加载XML失败');
              }
            }}
          >
            编辑
          </Button>
          <Button 
            size="small" 
            danger
            icon={<DeleteOutlined />}
            onClick={() => {
              Modal.confirm({
                title: '确认删除',
                content: `确定要删除流程定义 "${record.name}" 吗？这将删除所有版本和相关实例。`,
                onOk: async () => {
                  try {
                    const axios = getAuthenticatedAxios();
                    await deleteDeployment(axios, record.deploymentId);
                    message.success('删除成功');
                    loadProcesses();
                  } catch (error) {
                    message.error('删除失败');
                  }
                }
              });
            }}
          >
            删除
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Button 
          type="primary" 
          icon={<PlusOutlined />}
          onClick={() => {
            setSelectedProcess(null);
            setDesignerVisible(true);
          }}
        >
          新建流程
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={processes}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 10 }}
      />

      <Drawer
        title={selectedProcess ? '编辑流程' : '新建流程'}
        width="80%"
        open={designerVisible}
        onClose={() => setDesignerVisible(false)}
        destroyOnClose
        styles={{ body: { padding: 0, height: 'calc(100vh - 55px)' } }}
      >
        <BpmnDesigner
          initialXml={selectedProcess?.xml}
          onSave={handleSave}
        />
      </Drawer>

      <Modal
        title="查看流程"
        width="80%"
        open={viewerVisible}
        onCancel={() => {
          setViewerVisible(false);
          setSelectedProcess(null);
        }}
        footer={null}
        styles={{ body: { height: '70vh', padding: 0 } }}
        destroyOnClose
      >
        {selectedProcess?.xml && <ProcessViewer xml={selectedProcess.xml} />}
      </Modal>
    </div>
  );
};

export default ProcessDefinitionPage;