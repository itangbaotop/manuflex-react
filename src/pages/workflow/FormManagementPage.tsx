import React, { useState, useEffect } from 'react';
import { Table, Button, Space, message, Drawer, Modal } from 'antd';
import { PlusOutlined, EditOutlined, EyeOutlined } from '@ant-design/icons';
import { useAuth } from '../../context/AuthContext';
import { 
  getFormDefinitions, 
  createFormDefinition, 
  updateFormDefinition,
  type FormDefinition 
} from '../../api/form';
import FormJsDesigner from '../../components/workflow/FormJsDesigner';
import FormJsRenderer from '../../components/workflow/FormJsRenderer';

const FormManagementPage: React.FC = () => {
  const [forms, setForms] = useState<FormDefinition[]>([]);
  const [loading, setLoading] = useState(false);
  const [designerVisible, setDesignerVisible] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [selectedForm, setSelectedForm] = useState<FormDefinition | null>(null);
  const { getAuthenticatedAxios } = useAuth();

  const loadForms = async () => {
    setLoading(true);
    try {
      const axios = getAuthenticatedAxios();
      const response = await getFormDefinitions(axios);
      setForms(response.data);
    } catch (error) {
      message.error('加载表单定义失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadForms();
  }, []);

  const handleSave = async (schema: any, formKey: string, formName: string) => {
    try {
      const axios = getAuthenticatedAxios();
      if (selectedForm) {
        await updateFormDefinition(axios, selectedForm.id.toString(), { name: formName, schema });
        message.success('更新成功');
      } else {
        await createFormDefinition(axios, { key: formKey, name: formName, schema });
        message.success('创建成功');
      }
      setDesignerVisible(false);
      loadForms();
    } catch (error) {
      console.error('Save error:', error);
      message.error('保存失败');
    }
  };

  const columns = [
    {
      title: '表单名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '表单Key',
      dataIndex: 'formKey',
      key: 'formKey',
    },
    {
      title: '字段数量',
      dataIndex: 'schema',
      key: 'fieldCount',
      render: (schema: any) => {
        try {
          if (!schema) return 0;
          const parsed = typeof schema === 'string' ? JSON.parse(schema) : schema;
          return parsed?.components?.length || 0;
        } catch (e) {
          console.error('Parse schema error:', e, schema);
          return 0;
        }
      },
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => new Date(date).toLocaleString(),
    },
    {
      title: '更新时间',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      render: (date: string) => new Date(date).toLocaleString(),
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record: FormDefinition) => (
        <Space>
          <Button 
            size="small" 
            icon={<EyeOutlined />}
            onClick={() => {
              try {
                if (!record.schema) {
                  message.error('表单数据为空');
                  return;
                }
                const parsed = typeof record.schema === 'string' ? JSON.parse(record.schema) : record.schema;
                setSelectedForm({ ...record, schema: parsed });
                setPreviewVisible(true);
              } catch (e) {
                console.error('Parse error:', e, 'Schema type:', typeof record.schema, 'Schema:', record.schema);
                message.error('表单数据解析失败，请检查数据格式');
              }
            }}
          >
            预览
          </Button>
          <Button 
            size="small" 
            icon={<EditOutlined />}
            onClick={() => {
              try {
                if (!record.schema) {
                  message.error('表单数据为空');
                  return;
                }
                const parsed = typeof record.schema === 'string' ? JSON.parse(record.schema) : record.schema;
                setSelectedForm({ ...record, schema: parsed });
                setDesignerVisible(true);
              } catch (e) {
                console.error('Parse error:', e, 'Schema type:', typeof record.schema, 'Schema:', record.schema);
                message.error('表单数据解析失败，请检查数据格式');
              }
            }}
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
            setSelectedForm(null);
            setDesignerVisible(true);
          }}
        >
          新建表单
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={forms}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 10 }}
      />

      <Drawer
        title={selectedForm ? '编辑表单' : '新建表单'}
        width="60%"
        open={designerVisible}
        onClose={() => setDesignerVisible(false)}
        destroyOnClose
      >
        <FormJsDesigner
          initialSchema={selectedForm?.schema}
          initialFormKey={selectedForm?.formKey}
          initialFormName={selectedForm?.name}
          onSave={handleSave}
        />
      </Drawer>

      <Modal
        title="表单预览"
        width="60%"
        open={previewVisible}
        onCancel={() => setPreviewVisible(false)}
        footer={null}
        destroyOnClose
      >
        {selectedForm?.schema && (
          <FormJsRenderer
            schema={selectedForm.schema}
            onSubmit={(values) => {
              console.log('Preview submit:', values);
              message.info('这是预览模式，数据未提交');
            }}
            onCancel={() => setPreviewVisible(false)}
          />
        )}
      </Modal>
    </div>
  );
};

export default FormManagementPage;