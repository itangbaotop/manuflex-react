import React, { useEffect, useState } from 'react';
import { Table, Button, Modal, Form, Input, InputNumber, Select, message, Popconfirm, Tag, Radio, TreeSelect } from 'antd';
import { PlusOutlined, DeleteOutlined, EditOutlined, FolderOpenOutlined, FileOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { useAuth } from '../../context/AuthContext';
import { getAllMenus, createMenu, updateMenu, deleteMenu, MenuType } from '../../api/menu';
import type { Menu } from '../../api/menu';
import * as Icons from '@ant-design/icons';
import { getAvailableComponentPaths } from '../../config/componentMap';

const MenuPage: React.FC = () => {
    const { getAuthenticatedAxios } = useAuth();
    const [menus, setMenus] = useState<Menu[]>([]);
    const [loading, setLoading] = useState(false);
    
    // Modal 状态
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingMenu, setEditingMenu] = useState<Menu | null>(null);
    const [modalTitle, setModalTitle] = useState("");
    const [isParentIdDisabled, setIsParentIdDisabled] = useState(false); // 控制父级是否锁定
    
    const [form] = Form.useForm();

    // 资源准备
    const componentOptions = getAvailableComponentPaths().map(path => ({ label: path, value: path }));
    const iconOptions = Object.keys(Icons).filter(k => k.endsWith('Outlined')).slice(0, 100).map(k => ({ label: k, value: k }));

    // 1. 加载数据
    const fetchMenus = async () => {
        setLoading(true);
        try {
            const data = await getAllMenus(getAuthenticatedAxios());
            setMenus(buildTree(data)); 
        } catch (e) { 
            message.error('加载菜单失败'); 
        } finally { 
            setLoading(false); 
        }
    };

    const buildTree = (items: any[]) => {
        const map: any = {};
        const roots: any[] = [];
        // 关键：给 TreeSelect 用的数据需要 key/value/title
        const nodeList = items.map(i => ({ 
            ...i, 
            key: i.id, 
            value: i.id, 
            title: i.name,
            children: [] 
        }));
        
        nodeList.forEach(i => map[i.id] = i);
        nodeList.forEach(i => {
            if (i.parentId && map[i.parentId]) {
                map[i.parentId].children.push(i);
            } else {
                roots.push(i);
            }
        });
        return roots;
    };

    useEffect(() => { fetchMenus(); }, []);

    // 2. 操作处理
    // 打开“新增根菜单”
    const handleCreateRoot = () => {
        setEditingMenu(null);
        setModalTitle("新增根菜单");
        setIsParentIdDisabled(true); // 根菜单父级锁定为0
        form.resetFields();
        form.setFieldsValue({ parentId: 0, sortOrder: 1, type: MenuType.DIRECTORY });
        setIsModalOpen(true);
    };

    // 打开“添加子项”
    const handleAddChild = (parent: Menu) => {
        setEditingMenu(null);
        setModalTitle(`新增子菜单 (父级: ${parent.name})`);
        setIsParentIdDisabled(true); // 锁定父级，不可改
        form.resetFields();
        form.setFieldsValue({ 
            parentId: parent.id, 
            sortOrder: 1, 
            type: MenuType.MENU // 默认子项是菜单
        });
        setIsModalOpen(true);
    };

    // 打开“编辑”
    const handleEdit = (record: Menu) => {
        setEditingMenu(record);
        setModalTitle(`编辑: ${record.name}`);
        setIsParentIdDisabled(false); // 编辑时允许移动节点（修改父级）
        form.setFieldsValue(record);
        setIsModalOpen(true);
    };

    const handleSave = async () => {
        try {
            const values = await form.validateFields();
            const axios = getAuthenticatedAxios();
            
            if (editingMenu) {
                await updateMenu(axios, editingMenu.id, values);
                message.success('更新成功');
            } else {
                await createMenu(axios, values);
                message.success('创建成功');
            }
            
            setIsModalOpen(false);
            fetchMenus();
        } catch (e) { 
            message.error('操作失败'); 
        }
    };

    const handleDelete = async (id: number) => {
        try {
            await deleteMenu(getAuthenticatedAxios(), id);
            message.success('已删除');
            fetchMenus();
        } catch (e) {
            message.error('删除失败，请确保没有子菜单');
        }
    };

    // 3. 表格列定义
    const columns = [
        { 
            title: '名称', 
            dataIndex: 'name', 
            key: 'name',
            width: 250,
            render: (text: string, record: Menu) => (
                <span>
                    {/* 根据类型显示不同图标 */}
                    {record.type === MenuType.DIRECTORY && <FolderOpenOutlined style={{marginRight: 8, color: '#faad14'}} />}
                    {record.type === MenuType.MENU && <FileOutlined style={{marginRight: 8, color: '#1890ff'}} />}
                    {record.type === MenuType.BUTTON && <ThunderboltOutlined style={{marginRight: 8, color: '#52c41a'}} />}
                    {text}
                </span>
            )
        },
        { 
            title: '类型', 
            dataIndex: 'type', 
            key: 'type',
            width: 100,
            render: (type: number) => {
                if (type === MenuType.DIRECTORY) return <Tag color="orange">目录</Tag>;
                if (type === MenuType.MENU) return <Tag color="blue">菜单</Tag>;
                return <Tag color="green">按钮</Tag>;
            }
        },
        { 
            title: '路由/权限', 
            key: 'info',
            render: (_: any, r: Menu) => (
                <div style={{fontSize: 12}}>
                    {r.path && <div>路由: {r.path}</div>}
                    {r.permission && <div style={{color:'#888'}}>权限: {r.permission}</div>}
                </div>
            )
        },
        { 
            title: '组件', 
            dataIndex: 'component', 
            key: 'component',
            render: (t: string) => t ? <Tag>{t}</Tag> : '-'
        },
        { title: '排序', dataIndex: 'sortOrder', key: 'sortOrder', width: 60 },
        {
            title: '操作',
            key: 'action',
            width: 200,
            render: (_: any, r: Menu) => (
                <div onClick={e => e.stopPropagation()}>
                    <Button type="link" size="small" icon={<EditOutlined/>} onClick={()=>handleEdit(r)}>编辑</Button>
                    
                    {/* 只有目录和菜单可以添加子项 */}
                    {r.type !== MenuType.BUTTON && (
                        <Button type="link" size="small" icon={<PlusOutlined/>} onClick={()=>handleAddChild(r)}>子项</Button>
                    )}
                    
                    <Popconfirm title="确定删除?" onConfirm={()=>handleDelete(r.id)}>
                        <Button type="link" size="small" danger icon={<DeleteOutlined/>}>删除</Button>
                    </Popconfirm>
                </div>
            )
        }
    ];

    return (
        <div style={{ padding: 24 }}>
            <div style={{ marginBottom: 16 }}>
                <Button type="primary" icon={<PlusOutlined/>} onClick={handleCreateRoot}>新增根菜单</Button>
                <span style={{marginLeft: 16, color: '#999'}}>提示：类型为“按钮”的节点不会在左侧菜单显示。</span>
            </div>
            
            <Table 
                columns={columns} 
                dataSource={menus} 
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
                width={650}
            >
                <Form form={form} layout="vertical">
                    
                    {/* 类型选择 */}
                    <Form.Item name="type" label="菜单类型" rules={[{required: true}]}>
                        <Radio.Group buttonStyle="solid">
                            <Radio.Button value={MenuType.DIRECTORY}>目录 (Directory)</Radio.Button>
                            <Radio.Button value={MenuType.MENU}>菜单 (Menu)</Radio.Button>
                            <Radio.Button value={MenuType.BUTTON}>按钮 (Button)</Radio.Button>
                        </Radio.Group>
                    </Form.Item>

                    <div style={{display: 'flex', gap: 16}}>
                        <Form.Item name="name" label="名称" rules={[{required: true}]} style={{flex: 1}}>
                            <Input placeholder="例如: 用户管理" />
                        </Form.Item>
                        <Form.Item name="sortOrder" label="排序" style={{width: 100}}>
                            <InputNumber style={{width: '100%'}} min={0} />
                        </Form.Item>
                    </div>

                    {/* 父级选择 - 使用 TreeSelect */}
                    <Form.Item name="parentId" label="父级节点">
                        <TreeSelect
                            treeData={[{ id: 0, value: 0, title: '根节点 (Root)', children: [] }, ...menus]} // 添加根节点选项
                            fieldNames={{ label: 'title', value: 'id', children: 'children' }}
                            placeholder="选择父级"
                            allowClear
                            treeDefaultExpandAll
                            disabled={isParentIdDisabled} // ✅ 根据场景锁定
                        />
                    </Form.Item>

                    {/* 动态表单项：根据类型显示不同字段 */}
                    <Form.Item
                        noStyle
                        shouldUpdate={(prev, current) => prev.type !== current.type}
                    >
                        {({ getFieldValue }) => {
                            const type = getFieldValue('type');
                            return (
                                <>
                                    {type !== MenuType.BUTTON && (
                                        <div style={{display: 'flex', gap: 16}}>
                                            <Form.Item name="path" label="路由路径" style={{flex: 1}} help="浏览器地址栏显示的路径">
                                                <Input placeholder="/system/users" />
                                            </Form.Item>
                                            <Form.Item name="icon" label="图标" style={{width: 150}}>
                                                <Select options={iconOptions} showSearch allowClear />
                                            </Form.Item>
                                        </div>
                                    )}

                                    {type === MenuType.MENU && (
                                        <Form.Item name="component" label="前端组件" help="对应 src/pages 下的文件，业务表单选 DynamicCRUDPage">
                                            <Select options={componentOptions} showSearch allowClear />
                                        </Form.Item>
                                    )}

                                    <Form.Item name="permission" label="权限标识" help="对应后端 Controller 的 @PreAuthorize 权限">
                                        <Input placeholder={type === MenuType.BUTTON ? "user:delete" : "user:read"} />
                                    </Form.Item>
                                </>
                            );
                        }}
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default MenuPage;