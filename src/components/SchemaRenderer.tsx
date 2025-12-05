import React, { useEffect, useState } from 'react';
import { Form, Input, InputNumber, DatePicker, Select, Switch, message, Divider, Upload, Button } from 'antd';
import type { MetadataField } from '../api/metadata';
import { useAuth } from '../context/AuthContext';
import { searchDynamicData } from '../api/dynamicData';
import { uploadFile } from '../api/file';
import { LoadingOutlined, UploadOutlined } from '@ant-design/icons';

const { TextArea } = Input;
const { Option } = Select;

interface SchemaRendererProps {
  fields: MetadataField[];
}

// 定义一个子组件专门处理 Reference，方便处理异步加载
const ReferenceSelect: React.FC<{
    schema: string;
    displayField: string;
    value?: any;
    onChange?: (val: any) => void;
}> = ({ schema, displayField, value, onChange }) => {
    const { getAuthenticatedAxios, user } = useAuth();
    const [options, setOptions] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const load = async () => {
            if (!user?.tenantId || !schema) return;
            setLoading(true);
            try {
                // 查询关联表的前100条数据
                const res = await searchDynamicData(getAuthenticatedAxios(), user.tenantId, schema, 0, 100);
                
                console.log(`ReferenceSelect [${schema}] loaded:`, res.content); 
                
                setOptions(res.content.map((item: any) => ({
                    label: item.data[displayField] || `[ID:${item.id}]`, 
                    value: item.id // 存储 ID
                })));
            } catch (e) {
                console.error("加载引用数据失败", e);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [schema, user, getAuthenticatedAxios, displayField]);

    return (
        <Select 
            value={value} 
            onChange={onChange} 
            loading={loading}
            showSearch
            filterOption={(input, option) => ((option?.label as string) ?? '').toLowerCase().includes(input.toLowerCase())}
            options={options}
            placeholder={`选择 ${schema}...`}
            allowClear
        />
    );
};

const FileUploader: React.FC<{
    value?: string; // 存储的是 URL 字符串
    onChange?: (val: string) => void;
}> = ({ value, onChange }) => {
    const { getAuthenticatedAxios } = useAuth();
    const [loading, setLoading] = useState(false);

    // 自定义上传逻辑
    const customRequest = async (options: any) => {
        const { file, onSuccess, onError } = options;
        setLoading(true);
        try {
            const res = await uploadFile(getAuthenticatedAxios(), file);
            // 上传成功，将 URL 传给表单
            onChange?.(res.url); 
            onSuccess(res);
            message.success('上传成功');
        } catch (err) {
            console.error(err);
            onError(err);
            message.error('上传失败');
        } finally {
            setLoading(false);
        }
    };

    // 如果是图片，显示预览；否则显示链接
    const isImage = value && (value.match(/\.(jpeg|jpg|gif|png|webp)$/i) != null);

    return (
        <div>
            <Upload 
                customRequest={customRequest} 
                showUploadList={false} // 我们自己控制展示
            >
                <Button icon={loading ? <LoadingOutlined /> : <UploadOutlined />}>
                    点击上传
                </Button>
            </Upload>
            
            {/* 回显区域 */}
            {value && (
                <div style={{ marginTop: 8, border: '1px solid #eee', padding: 8, borderRadius: 4, display: 'inline-block' }}>
                    {isImage ? (
                        // 图片：直接预览 (inline)
                        <img 
                            src={value} 
                            alt="preview" 
                            style={{ maxWidth: '200px', maxHeight: '150px', objectFit: 'contain' }} 
                        />
                    ) : (
                        // 文件：点击强制下载 (attachment)
                        // 注意：这里拼接 ?download=true
                        <a 
                            href={`${value}?download=true`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                        >
                            {value.split('/').pop()} (点击下载)
                        </a>
                    )}
                </div>
            )}
        </div>
    );
};

export const SchemaRenderer: React.FC<SchemaRendererProps> = ({ fields }) => {
  
  if (!fields || fields.length === 0) {
      return <div style={{color: '#999', textAlign: 'center', padding: 20}}>该模型暂无字段定义，请先去模型设计器添加字段。</div>;
  }

  const renderFormItem = (field: MetadataField) => {
    const label = field.description || field.fieldName;
    const name = ['data', field.fieldName]; // 数据存储在 data 对象下
    
    // 构建校验规则
    const rules: any[] = [];
    if (field.required) {
        rules.push({ required: true, message: `请输入 ${label}` });
    }
    // 如果有正则校验
    if (field.validationRule) {
        try {
            // 简单的正则转换，实际场景可能需要更复杂的处理
            rules.push({ pattern: new RegExp(field.validationRule), message: '格式不正确' });
        } catch(e) {}
    }

    let inputNode = <Input />;

    switch (field.fieldType) {
      case 'STRING':
        inputNode = <Input placeholder={`请输入 ${label}`} />;
        break;
      
      case 'TEXT':
        inputNode = <TextArea rows={4} placeholder={`请输入 ${label}`} />;
        break;

      case 'INTEGER':
        inputNode = <InputNumber style={{ width: '100%' }} precision={0} placeholder="请输入整数" />;
        break;

      case 'NUMBER':
        inputNode = <InputNumber style={{ width: '100%' }} step={0.01} placeholder="请输入数值" />;
        break;

      case 'BOOLEAN':
        // 布尔值用 Switch 或 Radio
        return (
            <Form.Item key={field.fieldName} label={label} name={name} valuePropName="checked">
                <Switch checkedChildren="是" unCheckedChildren="否" />
            </Form.Item>
        );

      case 'DATE':
        inputNode = <DatePicker style={{ width: '100%' }} />;
        break;

      case 'DATETIME':
        inputNode = <DatePicker showTime style={{ width: '100%' }} />;
        break;

      case 'ENUM':
        let options: any[] = [];
        try {
            if (field.options) {
                // 解析 JSON 选项: ["A", "B"]
                const parsed = JSON.parse(field.options);
                if (Array.isArray(parsed)) {
                    options = parsed.map((opt: string) => ({ label: opt, value: opt }));
                }
            }
        } catch (e) {
            console.error(`Enum options parse failed for ${field.fieldName}`, e);
        }
        inputNode = (
          <Select placeholder={`请选择 ${label}`} allowClear>
             {options.map((o: any) => <Option key={o.value} value={o.value}>{o.label}</Option>)}
          </Select>
        );
        break;

      case 'REFERENCE':
        return (
            <Form.Item key={field.fieldName} label={label} name={name} rules={rules}>
                <ReferenceSelect 
                    schema={field.relatedSchemaName!} 
                    displayField={field.relatedFieldName!} 
                />
            </Form.Item>
        );
      case 'FILE':
        return (
            <Form.Item key={field.fieldName} label={label} name={name} rules={rules}>
                <FileUploader />
            </Form.Item>
        );

      default:
        inputNode = <Input />;
    }

    return (
      <Form.Item key={field.fieldName} label={label} name={name} rules={rules}>
        {inputNode}
      </Form.Item>
    );
  };

  return (
    <>
      {/* 渲染所有动态字段 */}
      {fields.map(field => renderFormItem(field))}
    </>
  );
};