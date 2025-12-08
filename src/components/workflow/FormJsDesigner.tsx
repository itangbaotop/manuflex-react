import React, { useEffect, useRef, useState } from 'react';
import { Button, message, Space, Input } from 'antd';
import { SaveOutlined } from '@ant-design/icons';
import { FormEditor } from '@bpmn-io/form-js';
import '@bpmn-io/form-js/dist/assets/form-js.css';
import '@bpmn-io/form-js/dist/assets/form-js-editor.css';

interface FormJsDesignerProps {
  initialSchema?: any;
  initialFormKey?: string;
  initialFormName?: string;
  onSave?: (schema: any, formKey: string, formName: string) => void;
}

const FormJsDesigner: React.FC<FormJsDesignerProps> = ({ initialSchema, initialFormKey, initialFormName, onSave }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<FormEditor | null>(null);
  const [formKey, setFormKey] = useState(initialFormKey || '');
  const [formName, setFormName] = useState(initialFormName || '');

  useEffect(() => {
    if (!containerRef.current) return;

    const editor = new FormEditor({
      container: containerRef.current
    });

    editorRef.current = editor;

    const schema = initialSchema || {
      type: 'default',
      components: []
    };

    editor.importSchema(schema).catch(err => {
      console.error('Error importing schema:', err);
      message.error('加载表单失败');
    });

    return () => {
      editor.destroy();
    };
  }, [initialSchema]);

  const handleSave = async () => {
    if (!editorRef.current) return;
    
    if (!formKey || !formName) {
      message.error('请填写表单Key和名称');
      return;
    }

    try {
      const schema = editorRef.current.saveSchema();
      if (onSave) {
        onSave(schema, formKey, formName);
      }
    } catch (err) {
      console.error('Error saving schema:', err);
      message.error('保存失败');
    }
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '16px', borderBottom: '1px solid #f0f0f0' }}>
        <Space size="large">
          <Space>
            <span>表单Key:</span>
            <Input 
              style={{ width: 200 }} 
              placeholder="唯一标识" 
              value={formKey} 
              onChange={(e) => setFormKey(e.target.value)}
              disabled={!!initialFormKey}
            />
          </Space>
          <Space>
            <span>表单名称:</span>
            <Input 
              style={{ width: 200 }} 
              placeholder="表单名称" 
              value={formName} 
              onChange={(e) => setFormName(e.target.value)}
            />
          </Space>
          <Button type="primary" icon={<SaveOutlined />} onClick={handleSave}>
            保存
          </Button>
        </Space>
      </div>
      <div ref={containerRef} style={{ flex: 1 }} />
    </div>
  );
};

export default FormJsDesigner;
