import React, { useState } from 'react';
import { Form, Input, Select, Button, Space, Card, InputNumber, Switch, message } from 'antd';
import { PlusOutlined, DeleteOutlined, SaveOutlined } from '@ant-design/icons';

interface FormField {
  id: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'select' | 'textarea' | 'checkbox';
  required: boolean;
  options?: string[];
  defaultValue?: any;
}

interface FormDesignerProps {
  initialSchema?: FormField[];
  onSave?: (schema: FormField[], formKey: string, formName: string) => void;
}

const FormDesigner: React.FC<FormDesignerProps> = ({ initialSchema = [], onSave }) => {
  const [fields, setFields] = useState<FormField[]>(initialSchema);
  const [formKey, setFormKey] = useState('');
  const [formName, setFormName] = useState('');

  const addField = () => {
    const newField: FormField = {
      id: `field_${Date.now()}`,
      label: '新字段',
      type: 'text',
      required: false
    };
    setFields([...fields, newField]);
  };

  const updateField = (index: number, updates: Partial<FormField>) => {
    const newFields = [...fields];
    newFields[index] = { ...newFields[index], ...updates };
    setFields(newFields);
  };

  const removeField = (index: number) => {
    setFields(fields.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    if (!formKey || !formName) {
      message.error('请填写表单Key和名称');
      return;
    }
    if (fields.length === 0) {
      message.error('请至少添加一个字段');
      return;
    }
    onSave?.(fields, formKey, formName);
  };

  return (
    <div style={{ padding: '24px' }}>
      <Card title="表单基本信息" style={{ marginBottom: 16 }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <Input
            placeholder="表单Key（唯一标识）"
            value={formKey}
            onChange={(e) => setFormKey(e.target.value)}
          />
          <Input
            placeholder="表单名称"
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
          />
        </Space>
      </Card>

      <Card 
        title="表单字段" 
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={addField}>
            添加字段
          </Button>
        }
      >
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          {fields.map((field, index) => (
            <Card 
              key={field.id} 
              size="small"
              extra={
                <Button 
                  danger 
                  size="small" 
                  icon={<DeleteOutlined />}
                  onClick={() => removeField(index)}
                >
                  删除
                </Button>
              }
            >
              <Space direction="vertical" style={{ width: '100%' }}>
                <Input
                  placeholder="字段标签"
                  value={field.label}
                  onChange={(e) => updateField(index, { label: e.target.value })}
                />
                <Select
                  style={{ width: '100%' }}
                  value={field.type}
                  onChange={(value) => updateField(index, { type: value })}
                  options={[
                    { label: '文本', value: 'text' },
                    { label: '数字', value: 'number' },
                    { label: '日期', value: 'date' },
                    { label: '下拉选择', value: 'select' },
                    { label: '多行文本', value: 'textarea' },
                    { label: '复选框', value: 'checkbox' }
                  ]}
                />
                {field.type === 'select' && (
                  <Select
                    mode="tags"
                    style={{ width: '100%' }}
                    placeholder="输入选项后按回车"
                    value={field.options}
                    onChange={(value) => updateField(index, { options: value })}
                  />
                )}
                <Space>
                  <span>必填：</span>
                  <Switch
                    checked={field.required}
                    onChange={(checked) => updateField(index, { required: checked })}
                  />
                </Space>
              </Space>
            </Card>
          ))}
        </Space>
      </Card>

      <div style={{ marginTop: 16, textAlign: 'center' }}>
        <Button 
          type="primary" 
          size="large" 
          icon={<SaveOutlined />}
          onClick={handleSave}
        >
          保存表单
        </Button>
      </div>
    </div>
  );
};

export default FormDesigner;