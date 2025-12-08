import React, { useEffect, useRef, useState } from 'react';
import { Button, message, Space, Input, Modal } from 'antd';
import { SaveOutlined, DownloadOutlined, UploadOutlined } from '@ant-design/icons';
import BpmnModeler from 'bpmn-js/lib/Modeler';
import { 
  BpmnPropertiesPanelModule, 
  BpmnPropertiesProviderModule,
  CamundaPlatformPropertiesProviderModule 
} from 'bpmn-js-properties-panel';
import CamundaBpmnModdle from 'camunda-bpmn-moddle/resources/camunda.json';
import 'bpmn-js/dist/assets/diagram-js.css';
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn.css';
import '@bpmn-io/properties-panel/dist/assets/properties-panel.css';
import './BpmnDesigner.css';

interface BpmnDesignerProps {
  initialXml?: string;
  onSave?: (xml: string, name: string) => void;
  readonly?: boolean;
}

const defaultXml = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" id="Definitions_1" targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn:process id="Process_1" isExecutable="true">
    <bpmn:startEvent id="StartEvent_1"/>
  </bpmn:process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Process_1">
      <bpmndi:BPMNShape id="_BPMNShape_StartEvent_2" bpmnElement="StartEvent_1">
        <dc:Bounds x="179" y="79" width="36" height="36"/>
      </bpmndi:BPMNShape>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>`;

const BpmnDesigner: React.FC<BpmnDesignerProps> = ({ initialXml, onSave, readonly = false }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const propertiesPanelRef = useRef<HTMLDivElement>(null);
  const modelerRef = useRef<BpmnModeler | null>(null);
  const [processName, setProcessName] = useState('');
  const [saveModalVisible, setSaveModalVisible] = useState(false);

  useEffect(() => {
    if (!containerRef.current || !propertiesPanelRef.current) return;

    const modeler = new BpmnModeler({
      container: containerRef.current,
      keyboard: { bindTo: document },
      propertiesPanel: {
        parent: propertiesPanelRef.current
      },
      additionalModules: [
        BpmnPropertiesPanelModule,
        BpmnPropertiesProviderModule,
        CamundaPlatformPropertiesProviderModule
      ],
      moddleExtensions: {
        camunda: CamundaBpmnModdle
      }
    });

    modelerRef.current = modeler;

    const xml = initialXml || defaultXml;
    
    modeler.importXML(xml).then(() => {
      const canvas = modeler.get('canvas');
      canvas.zoom('fit-viewport');
    }).catch(err => {
      console.error('Error importing XML:', err);
    });

    return () => {
      modeler.destroy();
    };
  }, [initialXml]);

  const handleSave = async () => {
    if (!modelerRef.current) return;
    
    try {
      const { xml } = await modelerRef.current.saveXML({ format: true });
      if (onSave && xml) {
        onSave(xml, processName);
        setSaveModalVisible(false);
        message.success('保存成功');
      }
    } catch (err) {
      console.error('Error saving XML:', err);
      message.error('保存失败');
    }
  };

  const handleDownload = async () => {
    if (!modelerRef.current) return;
    
    try {
      const { xml } = await modelerRef.current.saveXML({ format: true });
      if (xml) {
        const blob = new Blob([xml], { type: 'application/xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${processName || 'process'}.bpmn`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('Error downloading XML:', err);
      message.error('下载失败');
    }
  };

  const handleUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !modelerRef.current) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const xml = e.target?.result as string;
      try {
        await modelerRef.current?.importXML(xml);
        const canvas = modelerRef.current?.get('canvas');
        canvas?.zoom('fit-viewport');
        message.success('导入成功');
      } catch (err: any) {
        console.error('Error importing uploaded XML:', err);
        if (err.message?.includes('no diagram')) {
          message.error('文件缺少图形信息，请使用完整的BPMN文件');
        } else {
          message.error('导入文件失败: ' + err.message);
        }
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };



  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {!readonly && (
        <div style={{ padding: '16px', borderBottom: '1px solid #f0f0f0', flexShrink: 0 }}>
          <Space>
            <Button 
              type="primary" 
              icon={<SaveOutlined />} 
              onClick={() => setSaveModalVisible(true)}
            >
              保存
            </Button>
            <Button icon={<DownloadOutlined />} onClick={handleDownload}>
              下载
            </Button>
            <Button icon={<UploadOutlined />}>
              <input
                type="file"
                accept=".bpmn,.xml"
                onChange={handleUpload}
                style={{ position: 'absolute', opacity: 0, width: '100%', height: '100%', cursor: 'pointer' }}
              />
              导入
            </Button>
          </Space>
        </div>
      )}
      
      <div style={{ flex: 1, display: 'flex', flexDirection: 'row', overflow: 'hidden' }}>
        <div ref={containerRef} style={{ flex: 1, minHeight: 0 }} />
        {!readonly && (
          <div 
            ref={propertiesPanelRef} 
            style={{ 
              width: 320, 
              overflowY: 'auto', 
              borderLeft: '1px solid #f0f0f0',
              backgroundColor: '#fafafa'
            }} 
          />
        )}
      </div>

      <Modal
        title="保存流程"
        open={saveModalVisible}
        onOk={handleSave}
        onCancel={() => setSaveModalVisible(false)}
        okText="保存"
        cancelText="取消"
      >
        <Input
          placeholder="请输入流程名称"
          value={processName}
          onChange={(e) => setProcessName(e.target.value)}
        />
      </Modal>
    </div>
  );
};

export default BpmnDesigner;