import React, { useEffect, useRef } from 'react';
import { message } from 'antd';
import BpmnViewer from 'bpmn-js/lib/NavigatedViewer';
import 'bpmn-js/dist/assets/diagram-js.css';
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn.css';

interface ProcessViewerProps {
  xml: string;
  highlightedElements?: string[];
}

const ProcessViewer: React.FC<ProcessViewerProps> = ({ xml, highlightedElements = [] }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<BpmnViewer | null>(null);

  useEffect(() => {
    if (!containerRef.current || !xml) return;

    const viewer = new BpmnViewer({
      container: containerRef.current
    });

    viewerRef.current = viewer;

    viewer.importXML(xml).then(() => {
      const canvas = viewer.get('canvas');
      canvas.zoom('fit-viewport');
    }).catch(err => {
      console.error('Error importing XML:', err);
      message.error('加载流程图失败');
    });

    return () => {
      viewer.destroy();
    };
  }, [xml]);

  useEffect(() => {
    if (!viewerRef.current || !highlightedElements.length) return;

    try {
      const canvas = viewerRef.current.get('canvas');
      const elementRegistry = viewerRef.current.get('elementRegistry');
      
      // 清除之前的高亮
      elementRegistry.forEach((element: any) => {
        canvas.removeMarker(element.id, 'highlight');
      });

      // 添加新的高亮
      highlightedElements.forEach(elementId => {
        if (elementRegistry.get(elementId)) {
          canvas.addMarker(elementId, 'highlight');
        }
      });
    } catch (err) {
      console.error('Error highlighting elements:', err);
    }
  }, [highlightedElements]);

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
      <style>{`
        .highlight .djs-visual > :nth-child(1) {
          stroke: #52c41a !important;
          stroke-width: 3px !important;
        }
      `}</style>
    </div>
  );
};

export default ProcessViewer;