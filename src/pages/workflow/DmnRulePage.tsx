import React, { useState, useEffect } from 'react';
import { Table, Button, Space, message, Drawer, Modal } from 'antd';
import { PlusOutlined, EditOutlined, EyeOutlined, PlayCircleOutlined } from '@ant-design/icons';
import { useAuth } from '../../context/AuthContext';
import { getDmnDefinitions, deployDmn, getDmnDefinitionXml, type DmnDefinition } from '../../api/dmn';
import DmnDesigner from '../../components/workflow/DmnDesigner';

const DmnRulePage: React.FC = () => {
  const [definitions, setDefinitions] = useState<DmnDefinition[]>([]);
  const [loading, setLoading] = useState(false);
  const [designerVisible, setDesignerVisible] = useState(false);
  const [selectedDmn, setSelectedDmn] = useState<DmnDefinition | null>(null);
  const { getAuthenticatedAxios } = useAuth();

  const loadDefinitions = async () => {
    setLoading(true);
    try {
      const axios = getAuthenticatedAxios();
      const response = await getDmnDefinitions(axios);
      console.log('DMN definitions:', response.data);
      setDefinitions(response.data);
    } catch (error) {
      console.error('Load DMN error:', error);
      message.error('加载DMN定义失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDefinitions();
  }, []);

  const handleSave = async (xml: string, name: string) => {
    try {
      const axios = getAuthenticatedAxios();
      await deployDmn(axios, { name, xml });
      message.success('部署成功');
      setDesignerVisible(false);
      loadDefinitions();
    } catch (error) {
      message.error('部署失败');
    }
  };

  const handleView = async (record: DmnDefinition) => {
    try {
      const axios = getAuthenticatedAxios();
      const response = await getDmnDefinitionXml(axios, record.id);
      setSelectedDmn({ ...record, xml: response.data.xml });
      setDesignerVisible(true);
    } catch (error) {
      message.error('加载XML失败');
    }
  };

  const columns = [
    {
      title: '决策表名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '决策Key',
      dataIndex: 'key',
      key: 'key',
    },
    {
      title: '版本',
      dataIndex: 'version',
      key: 'version',
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record: DmnDefinition) => (
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
            onClick={() => handleView(record)}
          >
            编辑
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
            setSelectedDmn(null);
            setDesignerVisible(true);
          }}
        >
          新建决策表
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={definitions}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 10 }}
      />

      <Drawer
        title={selectedDmn ? '编辑决策表' : '新建决策表'}
        width="80%"
        open={designerVisible}
        onClose={() => setDesignerVisible(false)}
        destroyOnClose
        styles={{ body: { padding: 0, height: 'calc(100vh - 55px)', overflow: 'visible' } }}
        maskClosable={false}
      >
        <DmnDesigner
          initialXml={selectedDmn?.xml}
          onSave={handleSave}
        />
      </Drawer>
    </div>
  );
};

export default DmnRulePage;