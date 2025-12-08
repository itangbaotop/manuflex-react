import React, { useState, useEffect } from 'react';
import { Form, Input, Select, Switch, Card } from 'antd';

interface BpmnPropertiesPanelProps {
  element: any;
  onUpdate: (properties: Record<string, any>) => void;
}

const BpmnPropertiesPanel: React.FC<BpmnPropertiesPanelProps> = ({ element, onUpdate }) => {
  const [form] = Form.useForm();

  useEffect(() => {
    if (element) {
      form.setFieldsValue({
        id: element.id,
        name: element.businessObject?.name || '',
        assignee: element.businessObject?.assignee || '',
        formKey: element.businessObject?.formKey || ''
      });
    }
  }, [element]);

  const handleValuesChange = (changedValues: any, allValues: any) => {
    onUpdate(allValues);
  };

  if (!element) {
    return <Card title="属性面板">请选择一个元素</Card>;
  }

  const isUserTask = element.type === 'bpmn:UserTask';

  return (
    <Card title="属性面板" style={{ height: '100%', overflow: 'auto' }}>
      <Form
        form={form}
        layout="vertical"
        onValuesChange={handleValuesChange}
      >
        <Form.Item label="ID" name="id">
          <Input disabled />
        </Form.Item>

        <Form.Item label="名称" name="name">
          <Input placeholder="输入元素名称" />
        </Form.Item>

        {isUserTask && (
          <>
            <Form.Item label="分配人" name="assignee">
              <Input placeholder="例如: ${initiator}" />
            </Form.Item>

            <Form.Item label="表单Key" name="formKey">
              <Input placeholder="关联的表单标识" />
            </Form.Item>

            <Form.Item label="候选组" name="candidateGroups">
              <Select mode="tags" placeholder="输入候选组" />
            </Form.Item>
          </>
        )}
      </Form>
    </Card>
  );
};

export default BpmnPropertiesPanel;