import React from 'react';
import { Form, Input, InputNumber, DatePicker, Select, Checkbox, Button, Space } from 'antd';

interface FormField {
  id: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'select' | 'textarea' | 'checkbox';
  required: boolean;
  options?: string[];
  defaultValue?: any;
}

interface FormRendererProps {
  schema: FormField[];
  initialValues?: Record<string, any>;
  onSubmit?: (values: Record<string, any>) => void;
  onCancel?: () => void;
}

const FormRenderer: React.FC<FormRendererProps> = ({ 
  schema, 
  initialValues, 
  onSubmit, 
  onCancel 
}) => {
  const [form] = Form.useForm();

  const renderField = (field: FormField) => {
    switch (field.type) {
      case 'text':
        return <Input placeholder={`请输入${field.label}`} />;
      case 'number':
        return <InputNumber style={{ width: '100%' }} placeholder={`请输入${field.label}`} />;
      case 'date':
        return <DatePicker style={{ width: '100%' }} placeholder={`请选择${field.label}`} />;
      case 'select':
        return (
          <Select placeholder={`请选择${field.label}`}>
            {field.options?.map(opt => (
              <Select.Option key={opt} value={opt}>{opt}</Select.Option>
            ))}
          </Select>
        );
      case 'textarea':
        return <Input.TextArea rows={4} placeholder={`请输入${field.label}`} />;
      case 'checkbox':
        return <Checkbox>{field.label}</Checkbox>;
      default:
        return <Input />;
    }
  };

  return (
    <Form
      form={form}
      layout="vertical"
      initialValues={initialValues}
      onFinish={onSubmit}
    >
      {schema.map(field => (
        <Form.Item
          key={field.id}
          name={field.id}
          label={field.type !== 'checkbox' ? field.label : undefined}
          rules={[{ required: field.required, message: `${field.label}为必填项` }]}
          valuePropName={field.type === 'checkbox' ? 'checked' : 'value'}
        >
          {renderField(field)}
        </Form.Item>
      ))}
      
      <Form.Item>
        <Space>
          <Button type="primary" htmlType="submit">
            提交
          </Button>
          {onCancel && (
            <Button onClick={onCancel}>
              取消
            </Button>
          )}
        </Space>
      </Form.Item>
    </Form>
  );
};

export default FormRenderer;