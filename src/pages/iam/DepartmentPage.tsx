import React, { useEffect, useState } from 'react';
import { Table, Button, Modal, Form, Input, InputNumber, message, Popconfirm, Tag, Switch, TreeSelect, Space } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, ApartmentOutlined } from '@ant-design/icons';
import { useAuth } from '../../context/AuthContext';
import { getDepartmentTree, createDepartment, updateDepartment, deleteDepartment } from '../../api/department';
import type { Department } from '../../api/department';

const DepartmentPage: React.FC = () => {
  const { getAuthenticatedAxios } = useAuth();
  const [depts, setDepts] = useState<Department[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Modal 状态
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [modalTitle, setModalTitle] = useState("");
  const [form] = Form.useForm();

  // 加载数据
  const fetchDepts = async () => {
    setLoading(true);
    try {
      const data = await getDepartmentTree(getAuthenticatedAxios());
      // 后端直接返回了树形结构，无需前端转换
      setDepts(data);
    } catch (e) {
      message.error('加载部门数据失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepts();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 转换数据给 TreeSelect 使用 (添加 title/value/key 字段)
  const formatTreeData = (items: Department[]): any[] => {
      return items.map(item => ({
          ...item,
          title: item.name,
          value: item.id,
          key: item.id,
          children: item.children ? formatTreeData(item.children) : []
      }));
  };

  // 操作处理
  const handleCreateRoot = () => {
      setEditingDept(null);
      setModalTitle("新增根部门");
      form.resetFields();
      form.setFieldsValue({ parentId: 0, sortOrder: 1, status: true });
      setIsModalOpen(true);
  };

  const handleAddChild = (parent: Department) => {
      setEditingDept(null);
      setModalTitle(`新增子部门 (上级: ${parent.name})`);
      form.resetFields();
      form.setFieldsValue({ parentId: parent.id, sortOrder: 1, status: true });
      setIsModalOpen(true);
  };

  const handleEdit = (record: Department) => {
      setEditingDept(record);
      setModalTitle(`编辑: ${record.name}`);
      form.setFieldsValue(record);
      setIsModalOpen(true);
  };

  const handleSave = async () => {
      try {
          const values = await form.validateFields();
          const axios = getAuthenticatedAxios();
          if (editingDept) {
              await updateDepartment(axios, editingDept.id, values);
              message.success('更新成功');
          } else {
              await createDepartment(axios, values);
              message.success('创建成功');
          }
          setIsModalOpen(false);
          fetchDepts();
      } catch (e) {
          message.error('操作失败');
      }
  };

  const handleDelete = async (id: number) => {
      try {
          await deleteDepartment(getAuthenticatedAxios(), id);
          message.success('已删除');
          fetchDepts();
      } catch (e: any) {
          message.error(e.response?.data?.message || '删除失败，请检查是否有子部门');
      }
  };

  const columns = [
      { title: '部门名称', dataIndex: 'name', key: 'name', width: 250 },
      { title: '排序', dataIndex: 'sortOrder', key: 'sortOrder', width: 80 },
      { title: '负责人', dataIndex: 'leader', key: 'leader', width: 120 },
      { title: '联系电话', dataIndex: 'phone', key: 'phone', width: 150 },
      { 
          title: '状态', 
          dataIndex: 'status', 
          key: 'status', 
          width: 100,
          render: (status: boolean) => <Tag color={status ? 'green' : 'red'}>{status ? '正常' : '停用'}</Tag>
      },
      {
          title: '操作',
          key: 'action',
          render: (_: any, record: Department) => (
              <Space onClick={e => e.stopPropagation()}>
                  <Button type="link" size="small" icon={<EditOutlined/>} onClick={()=>handleEdit(record)}>编辑</Button>
                  <Button type="link" size="small" icon={<PlusOutlined/>} onClick={()=>handleAddChild(record)}>子部门</Button>
                  <Popconfirm title="确定删除?" onConfirm={()=>handleDelete(record.id)}>
                      <Button type="link" size="small" danger icon={<DeleteOutlined/>}>删除</Button>
                  </Popconfirm>
              </Space>
          )
      }
  ];

  return (
      <div style={{ padding: 24 }}>
          <div style={{ marginBottom: 16 }}>
              <Button type="primary" icon={<ApartmentOutlined />} onClick={handleCreateRoot}>新增根部门</Button>
          </div>
          
          <Table 
              columns={columns} 
              dataSource={depts} 
              rowKey="id" 
              loading={loading} 
              pagination={false} 
              defaultExpandAllRows 
          />

          <Modal 
              title={modalTitle} 
              open={isModalOpen} 
              onOk={handleSave} 
              onCancel={()=>setIsModalOpen(false)}
          >
              <Form form={form} layout="vertical">
                  <Form.Item name="name" label="部门名称" rules={[{required: true}]}>
                      <Input />
                  </Form.Item>
                  
                  <Form.Item name="parentId" label="上级部门">
                      <TreeSelect
                          treeData={[{ id: 0, name: '根节点', value: 0, title: '根节点 (Root)', children: [] }, ...formatTreeData(depts)]}
                          fieldNames={{ label: 'title', value: 'id', children: 'children' }}
                          placeholder="选择上级部门"
                          treeDefaultExpandAll
                          allowClear
                      />
                  </Form.Item>

                  <div style={{display: 'flex', gap: 16}}>
                      <Form.Item name="leader" label="负责人" style={{flex:1}}>
                          <Input />
                      </Form.Item>
                      <Form.Item name="phone" label="联系电话" style={{flex:1}}>
                          <Input />
                      </Form.Item>
                  </div>

                  <div style={{display: 'flex', gap: 16}}>
                      <Form.Item name="email" label="邮箱" style={{flex:1}}>
                          <Input />
                      </Form.Item>
                      <Form.Item name="sortOrder" label="排序" style={{width: 100}}>
                          <InputNumber style={{width:'100%'}} min={0} />
                      </Form.Item>
                  </div>

                  <Form.Item name="status" label="状态" valuePropName="checked">
                      <Switch checkedChildren="正常" unCheckedChildren="停用" />
                  </Form.Item>
              </Form>
          </Modal>
      </div>
  );
};

export default DepartmentPage;