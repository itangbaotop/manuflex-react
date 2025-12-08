import React, { useEffect, useRef, useState } from 'react';
import { Button, message, Space, Input, Modal } from 'antd';
import { SaveOutlined, DownloadOutlined, UploadOutlined } from '@ant-design/icons';
import DmnModeler from 'dmn-js/lib/Modeler';
import 'dmn-js/dist/assets/dmn-js-decision-table-controls.css';
import 'dmn-js/dist/assets/dmn-js-decision-table.css';
import 'dmn-js/dist/assets/dmn-js-drd.css';
import 'dmn-js/dist/assets/dmn-js-literal-expression.css';
import 'dmn-js/dist/assets/dmn-js-shared.css';
import 'dmn-js/dist/assets/dmn-font/css/dmn.css';

interface DmnDesignerProps {
  initialXml?: string;
  onSave?: (xml: string, name: string) => void;
  readonly?: boolean;
}

const defaultXml = `<?xml version="1.0" encoding="UTF-8"?>
<definitions xmlns="https://www.omg.org/spec/DMN/20191111/MODEL/" xmlns:dmndi="https://www.omg.org/spec/DMN/20191111/DMNDI/" xmlns:dc="http://www.omg.org/spec/DMN/20180521/DC/" id="Definitions_1" name="DRD" namespace="http://camunda.org/schema/1.0/dmn">
  <decision id="Decision_1" name="Decision 1">
    <decisionTable id="DecisionTable_1">
      <input id="Input_1">
        <inputExpression id="InputExpression_1" typeRef="string">
          <text></text>
        </inputExpression>
      </input>
      <output id="Output_1" typeRef="string" />
    </decisionTable>
  </decision>
</definitions>`;

const DmnDesigner: React.FC<DmnDesignerProps> = ({ initialXml, onSave, readonly = false }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const modelerRef = useRef<DmnModeler | null>(null);
  const [decisionName, setDecisionName] = useState('');
  const [saveModalVisible, setSaveModalVisible] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;

    const modeler = new DmnModeler({
      container: containerRef.current
    });

    modelerRef.current = modeler;

    const xml = initialXml || defaultXml;
    
    modeler.importXML(xml).then(() => {
      const views = modeler.getViews();
      if (views && views.length > 0) {
        const decisionView = views.find((v: any) => v.type === 'decisionTable');
        if (decisionView) {
          modeler.open(decisionView);
        }
      }
    }).catch(err => {
      console.error('Error importing DMN:', err);
      message.error('加载决策表失败');
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
        onSave(xml, decisionName);
        setSaveModalVisible(false);
        message.success('保存成功');
      }
    } catch (err) {
      console.error('Error saving DMN:', err);
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
        a.download = `${decisionName || 'decision'}.dmn`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('Error downloading DMN:', err);
      message.error('下载失败');
    }
  };

  const handleUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !modelerRef.current) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const xml = e.target?.result as string;
      modelerRef.current?.importXML(xml).catch(err => {
        console.error('Error importing uploaded DMN:', err);
        message.error('导入文件失败');
      });
    };
    reader.readAsText(file);
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {!readonly && (
        <div style={{ padding: '16px', borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
                accept=".dmn,.xml"
                onChange={handleUpload}
                style={{ position: 'absolute', opacity: 0, width: '100%', height: '100%', cursor: 'pointer' }}
              />
              导入
            </Button>
          </Space>
        </div>
      )}
      
      <div ref={containerRef} style={{ flex: 1, minHeight: '500px', position: 'relative' }} />
      
      <style>{`
        .dmn-decision-table-container select,
        .dmn-decision-table-container .dmn-icon-select,
        .tjs-table select,
        .tjs-table .dmn-icon-select,
        .tjs-table .dropdown,
        .cell select,
        .cell .dropdown {
          pointer-events: auto !important;
          cursor: pointer !important;
          z-index: 1000 !important;
        }
        .dmn-decision-table-container .cell,
        .tjs-table .cell {
          pointer-events: auto !important;
        }
        .tjs-table .cell.selected {
          z-index: 100 !important;
        }
        .ant-drawer-body {
          pointer-events: auto !important;
        }
      `}</style>

      <Modal
        title="保存决策表"
        open={saveModalVisible}
        onOk={handleSave}
        onCancel={() => setSaveModalVisible(false)}
        okText="保存"
        cancelText="取消"
      >
        <Input
          placeholder="请输入决策表名称"
          value={decisionName}
          onChange={(e) => setDecisionName(e.target.value)}
        />
      </Modal>
    </div>
  );
};

export default DmnDesigner;