import React, { useState, useEffect } from 'react';
import { Modal, Select, Form, Button, Space, message } from 'antd';
import { useAuth } from '../../context/AuthContext';
import { getFormDefinitions, type FormDefinition } from '../../api/form';

interface ProcessFormBinderProps {
  visible: boolean;
  processKey: string;
  onBind: (formKey: string) => void;
  onCancel: () => void;
}

const ProcessFormBinder: React.FC<ProcessFormBinderProps> = ({
  visible,
  processKey,
  onBind,
  onCancel
}) => {
  const [forms, setForms] = useState<FormDefinition[]>([]);
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();
  const { getAuthenticatedAxios } = useAuth();

  useEffect(() => {
    if (visible) {
      loadForms();
    }
  }, [visible]);

  const loadForms = async () => {
    setLoading(true);
    try {
      const axios = getAuthenticatedAxios();
      const response = await getFormDefinitions(axios);
      setForms(response.data);
    } catch (error) {
      message.error('加载表单列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (values: any) => {
    onBind(values.formKey);
    form.resetFields();
  };

  return (
    <Modal
      title="绑定表单"
      open={visible}
      onCancel={() => {
        onCancel();
        form.resetFields();
      }}
      footer={null}
    >
      <Form form={form} onFinish={handleSubmit} layout="vertical">
        <Form.Item
          label="选择表单"
          name="formKey"
          rules={[{ required: true, message: '请选择表单' }]}
        >
          <Select
            placeholder="请选择要绑定的表单"
            loading={loading}
            options={forms.map(f => ({ label: f.name, value: f.key }))}
          />
        </Form.Item>
        <Form.Item>
          <Space>
            <Button type="primary" htmlType="submit">
              绑定
            </Button>
            <Button onClick={onCancel}>
              取消
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default ProcessFormBinder;