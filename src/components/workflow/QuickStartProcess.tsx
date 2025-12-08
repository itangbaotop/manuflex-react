import React, { useState, useEffect } from 'react';
import { Card, Select, Button, Space, message, Form } from 'antd';
import { PlayCircleOutlined } from '@ant-design/icons';
import { useAuth } from '../../context/AuthContext';
import { getProcessDefinitions, startProcess, type ProcessDefinition } from '../../api/workflow';
import { getFormDefinition } from '../../api/form';
import FormRenderer from './FormRenderer';

const QuickStartProcess: React.FC = () => {
  const [definitions, setDefinitions] = useState<ProcessDefinition[]>([]);
  const [selectedDef, setSelectedDef] = useState<string>('');
  const [formSchema, setFormSchema] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(false);
  const { getAuthenticatedAxios } = useAuth();

  useEffect(() => {
    loadDefinitions();
  }, []);

  const loadDefinitions = async () => {
    try {
      const axios = getAuthenticatedAxios();
      const response = await getProcessDefinitions(axios);
      setDefinitions(response.data);
    } catch (error) {
      message.error('加载流程定义失败');
    }
  };

  const handleSelectProcess = async (key: string) => {
    setSelectedDef(key);
    setFormSchema(null);
    
    // 尝试加载关联的表单
    try {
      const axios = getAuthenticatedAxios();
      const response = await getFormDefinition(axios, `start_${key}`);
      setFormSchema(response.data.schema);
    } catch (error) {
      // 没有关联表单，使用默认启动
    }
  };

  const handleStart = async (values?: any) => {
    if (!selectedDef) {
      message.error('请选择流程');
      return;
    }

    setLoading(true);
    try {
      const axios = getAuthenticatedAxios();
      await startProcess(axios, {
        processDefinitionKey: selectedDef,
        variables: values
      });
      message.success('流程启动成功');
      setSelectedDef('');
      setFormSchema(null);
    } catch (error) {
      message.error('流程启动失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card title="快速启动流程">
      <Space direction="vertical" style={{ width: '100%' }}>
        <Select
          style={{ width: '100%' }}
          placeholder="选择要启动的流程"
          value={selectedDef || undefined}
          onChange={handleSelectProcess}
          options={definitions.map(d => ({ 
            label: `${d.name} (v${d.version})`, 
            value: d.key 
          }))}
        />

        {selectedDef && !formSchema && (
          <Button 
            type="primary" 
            icon={<PlayCircleOutlined />}
            loading={loading}
            onClick={() => handleStart()}
          >
            启动流程
          </Button>
        )}

        {formSchema && (
          <FormRenderer
            schema={formSchema}
            onSubmit={handleStart}
            onCancel={() => {
              setSelectedDef('');
              setFormSchema(null);
            }}
          />
        )}
      </Space>
    </Card>
  );
};

export default QuickStartProcess;