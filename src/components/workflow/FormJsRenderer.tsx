import React, { useEffect, useRef } from 'react';
import { Button, Space } from 'antd';
import { Form } from '@bpmn-io/form-js';
import '@bpmn-io/form-js/dist/assets/form-js.css';

interface FormJsRendererProps {
  schema: any;
  initialData?: Record<string, any>;
  onSubmit?: (data: Record<string, any>) => void;
  onCancel?: () => void;
}

const FormJsRenderer: React.FC<FormJsRendererProps> = ({ 
  schema, 
  initialData, 
  onSubmit, 
  onCancel 
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<Form | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const form = new Form({
      container: containerRef.current
    });

    formRef.current = form;

    form.importSchema(schema, initialData).catch(err => {
      console.error('Error importing schema:', err);
    });

    form.on('submit', (event: any) => {
      if (onSubmit) {
        onSubmit(event.data);
      }
    });

    return () => {
      form.destroy();
    };
  }, [schema, initialData]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div ref={containerRef} />
      {onCancel && (
        <Space>
          <Button onClick={onCancel}>取消</Button>
        </Space>
      )}
    </div>
  );
};

export default FormJsRenderer;
