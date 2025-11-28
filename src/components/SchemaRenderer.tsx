import React from 'react';
import { Form, Input, InputNumber, DatePicker, Select, Switch, Checkbox } from 'antd';
import { MetadataField } from '../api/metadata';
import dayjs from 'dayjs';

const { TextArea } = Input;

interface SchemaRendererProps {
  fields: MetadataField[];
}

export const SchemaRenderer: React.FC<SchemaRendererProps> = ({ fields }) => {
  
  // 核心逻辑：根据 fieldType 渲染不同的组件
  const renderFormItem = (field: MetadataField) => {
    const label = field.description || field.fieldName;
    const name = ['data', field.fieldName]; // 绑定到 values.data.fieldName
    const rules = [
      { required: field.required, message: `Please input ${label}` },
      // 可以在这里扩展正则校验： field.validationRule
    ];

    switch (field.fieldType) {
      case 'STRING':
        return (
          <Form.Item key={field.id} label={label} name={name} rules={rules}>
            <Input />
          </Form.Item>
        );
      
      case 'TEXT':
        return (
          <Form.Item key={field.id} label={label} name={name} rules={rules}>
            <TextArea rows={4} />
          </Form.Item>
        );

      case 'INTEGER':
      case 'NUMBER':
        return (
          <Form.Item key={field.id} label={label} name={name} rules={rules}>
            <InputNumber style={{ width: '100%' }} />
          </Form.Item>
        );

      case 'BOOLEAN':
        return (
          <Form.Item key={field.id} label={label} name={name} valuePropName="checked">
            <Switch />
          </Form.Item>
        );

      case 'DATE':
      case 'DATETIME':
        return (
          <Form.Item key={field.id} label={label} name={name} rules={rules}>
            <DatePicker 
                showTime={field.fieldType === 'DATETIME'} 
                style={{ width: '100%' }} 
            />
          </Form.Item>
        );

      case 'ENUM':
        // 解析后端的 options JSON 字符串
        let options = [];
        try {
            if (field.options) {
                options = JSON.parse(field.options).map((opt: string) => ({ label: opt, value: opt }));
            }
        } catch (e) {
            console.error("Failed to parse enum options", e);
        }
        return (
          <Form.Item key={field.id} label={label} name={name} rules={rules}>
            <Select options={options} />
          </Form.Item>
        );

      default:
        return (
          <Form.Item key={field.id} label={label} name={name}>
            <Input placeholder={`Unsupported type: ${field.fieldType}`} disabled />
          </Form.Item>
        );
    }
  };

  return (
    <>
      {fields.map(field => renderFormItem(field))}
    </>
  );
};