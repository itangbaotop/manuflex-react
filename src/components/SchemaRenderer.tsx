import React from 'react';
import { Form, Input, InputNumber, DatePicker, Select, Switch } from 'antd';
import type { MetadataFieldDTO } from '../api/metadata';
import type { DefaultOptionType } from 'antd/es/select'; // 导入 DefaultOptionType

const { TextArea } = Input;

interface SchemaRendererProps {
  fields: MetadataFieldDTO[];
}

export const SchemaRenderer: React.FC<SchemaRendererProps> = ({ fields }) => {

  const renderFormItem = (field: MetadataFieldDTO) => {
    const label = field.label || field.fieldName;
    const name = ['data', field.fieldName];
    const rules = [
      { required: field.required, message: `请输入${label}` },
    ];

    switch (field.fieldType) {
      case 'STRING':
        return (
          <Form.Item key={field.id} label={label} name={name} rules={rules}>
            <Input />
          </Form.Item>
        );

      case 'TEXTAREA':
        return (
          <Form.Item key={field.id} label={label} name={name} rules={rules}>
            <TextArea rows={4} />
          </Form.Item>
        );

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
        return (
          <Form.Item key={field.id} label={label} name={name} rules={rules}>
            <DatePicker
                style={{ width: '100%' }}
            />
          </Form.Item>
        );

      case 'ENUM':
        // 明确声明 options 的类型
        let options: DefaultOptionType[] = [];
        if (field.options && Array.isArray(field.options)) {
            options = field.options.map((opt: string) => ({ label: opt, value: opt }));
        }
        return (
          <Form.Item key={field.id} label={label} name={name} rules={rules}>
            <Select options={options} />
          </Form.Item>
        );

      default:
        return (
          <Form.Item key={field.id} label={label} name={name}>
            <Input placeholder={`不支持的字段类型: ${field.fieldType}`} disabled />
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
