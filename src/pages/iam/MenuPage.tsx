import React, { useEffect, useState, useCallback } from 'react';
import { Table, Button, Modal, Form, Input, InputNumber, Select, message, Popconfirm, Tag, Space } from 'antd';
import { PlusOutlined, DeleteOutlined, EditOutlined, FileOutlined } from '@ant-design/icons';
import { useAuth } from '../../context/AuthContext';
import { getMenus, createMenu, updateMenu, deleteMenu } from '../../api/menu';
import type { MenuDTO } from '../../api/menu';
import { useIamApi } from '../../api/iam';
import type { PermissionDTO } from '../../api/iam';
import * as Icons from '@ant-design/icons';
import type { DefaultOptionType } from 'antd/es/select'; // 导入 DefaultOptionType

const { Option } = Select;

const renderIcon = (iconName?: string) => {
    if (!iconName) return <FileOutlined />;
    const IconComp = (Icons as any)[iconName];
    return IconComp ? <IconComp /> : <FileOutlined />;
};

const MenuPage: React.FC = () => {
    const { getAuthenticatedAxios } = useAuth();
    const { getAllPermissions } = useIamApi();
    const [menus, setMenus] = useState<MenuDTO[]>([]);
    const [allPermissions, setAllPermissions] = useState<PermissionDTO[]>([]);
    const [loading, setLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingMenu, setEditingMenu] = useState<MenuDTO | null>(null);
    const [form] = Form.useForm();

    const fetchMenus = useCallback(async () => {
        setLoading(true);
        try {
            const authAxios = getAuthenticatedAxios();
            const data = await getMenus(authAxios);
            const treeData = buildMenuTree(data);
            setMenus(treeData);
        } catch (e) {
            console.error('加载菜单失败', e);
            message.error('加载菜单失败');
        } finally {
            setLoading(false);
        }
    }, [getAuthenticatedAxios]);

    const fetchAllPermissions = useCallback(async () => {
        try {
            const data = await getAllPermissions();
            setAllPermissions(data);
        } catch (e) {
            console.error('加载所有权限失败', e);
            message.error('加载所有权限失败');
        }
    }, [getAllPermissions]);

    useEffect(() => {
        fetchMenus();
        fetchAllPermissions();
    }, [fetchMenus, fetchAllPermissions]);

    const buildMenuTree = (items: MenuDTO[]): MenuDTO[] => {
        const map: { [key: string]: MenuDTO & { children?: MenuDTO[] } } = {};
        const roots: MenuDTO[] = [];

        items.forEach(item => {
            map[item.id] = { ...item, children: [] };
        });

        items.forEach(item => {
            if (item.parentId && map[item.parentId]) {
                map[item.parentId].children!.push(map[item.id]);
            } else {
                roots.push(map[item.id]);
            }
        });

        Object.values(map).forEach(node => {
            if (node.children) {
                node.children.sort((a, b) => a.orderNum - b.orderNum);
            }
        });
        roots.sort((a, b) => a.orderNum - b.orderNum);

        return roots;
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            const values = await form.validateFields();
            const authAxios = getAuthenticatedAxios();

            const parentId = values.parentId === null || values.parentId === 0 ? null : values.parentId;
            const menuData = { ...values, parentId };

            if (editingMenu) {
                await updateMenu(authAxios, editingMenu.id, menuData);
            } else {
                await createMenu(authAxios, menuData);
            }
            message.success('保存成功');
            setIsModalOpen(false);
            form.resetFields();
            fetchMenus();
            message.info('请刷新页面以查看左侧菜单变化');
        } catch (e) {
            console.error('保存菜单失败', e);
            message.error('保存失败');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        setLoading(true);
        try {
            await deleteMenu(getAuthenticatedAxios(), id);
            message.success('删除成功');
            fetchMenus();
            message.info('请刷新页面以查看左侧菜单变化');
        } catch(e) {
            console.error('删除菜单失败', e);
            message.error('删除失败');
        } finally {
            setLoading(false);
        }
    };

    const columns = [
        {
            title: '菜单名称',
            dataIndex: 'name',
            key: 'name',
            render: (text: string, record: MenuDTO) => (
                <Space>
                    {renderIcon(record.icon)}
                    {text}
                </Space>
            )
        },
        { title: '图标', dataIndex: 'icon', key: 'icon', render: (icon: string) => icon ? <Tag>{icon}</Tag> : '-' },
        { title: '路由路径', dataIndex: 'path', key: 'path' },
        {
            title: '所需权限',
            dataIndex: 'permissions',
            key: 'permissions',
            render: (permissions: string[]) => (
                <Space size={[0, 8]} wrap>
                    {permissions?.map(p => <Tag key={p}>{p}</Tag>)}
                </Space>
            )
        },
        { title: '排序', dataIndex: 'orderNum', key: 'orderNum' },
        {
            title: '操作',
            key: 'action',
            render: (_: any, record: MenuDTO) => (
                <Space size="middle">
                    <Button type="link" icon={<EditOutlined />} onClick={() => {
                        setEditingMenu(record);
                        form.setFieldsValue({
                            ...record,
                            parentId: record.parentId === null ? 0 : record.parentId
                        });
                        setIsModalOpen(true);
                    }}>编辑</Button>
                    <Button type="link" icon={<PlusOutlined />} onClick={() => {
                        setEditingMenu(null);
                        form.resetFields();
                        form.setFieldsValue({ parentId: record.id, orderNum: 0, type: 'MENU' });
                        setIsModalOpen(true);
                    }}>添加子项</Button>
                    <Popconfirm title="确定删除?" onConfirm={() => handleDelete(record.id)}>
                        <Button type="link" danger icon={<DeleteOutlined />}>删除</Button>
                    </Popconfirm>
                </Space>
            )
        }
    ];

    const iconKeys = Object.keys(Icons).filter(k => k.endsWith('Outlined') || k.endsWith('Filled') || k.endsWith('TwoTone'));

    return (
        <div style={{ padding: 24 }}>
            <div style={{ marginBottom: 16 }}>
                 <Button type="primary" icon={<PlusOutlined />} onClick={() => {
                     setEditingMenu(null);
                     form.resetFields();
                     form.setFieldsValue({ parentId: null, orderNum: 0, type: 'MENU' });
                     setIsModalOpen(true);
                 }}>新增根菜单</Button>
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
                title={editingMenu ? "编辑菜单" : "新增菜单"}
                open={isModalOpen}
                onOk={handleSave}
                onCancel={() => { setIsModalOpen(false); form.resetFields(); setEditingMenu(null); }}
                confirmLoading={loading}
            >
                <Form form={form} layout="vertical">
                    <Form.Item name="name" label="菜单名称" rules={[{ required: true, message: '请输入菜单名称' }]}>
                        <Input />
                    </Form.Item>
                    <Form.Item name="parentId" label="父级菜单ID (留空或0为根节点)">
                        <Input placeholder="父级菜单ID" />
                    </Form.Item>
                    <Form.Item name="path" label="路由路径">
                        <Input placeholder="/system/users" />
                    </Form.Item>
                    <Form.Item name="type" label="菜单类型" rules={[{ required: true, message: '请选择菜单类型' }]}>
                        <Select>
                            <Option value="MENU">菜单</Option>
                            <Option value="BUTTON">按钮</Option>
                        </Select>
                    </Form.Item>
                    <Form.Item name="permissions" label="所需权限" tooltip="访问此菜单或功能所需的权限标识，多个用逗号分隔">
                        <Select
                            mode="multiple"
                            placeholder="请选择所需权限"
                            filterOption={(input, option?: DefaultOptionType) => {
                                // 确保 option?.value 是 string 类型再调用 toLowerCase
                                const optionValue = String(option?.value || '').toLowerCase();
                                return optionValue.includes(input.toLowerCase());
                            }}
                            options={allPermissions.map(p => ({ label: `${p.name} (${p.code})`, value: p.code }))}
                        />
                    </Form.Item>
                    <Form.Item name="icon" label="图标">
                         <Select
                            showSearch
                            allowClear
                            placeholder="请选择 Ant Design 图标"
                            filterOption={(input, option?: DefaultOptionType) => {
                                // 确保 option?.value 是 string 类型再调用 toLowerCase
                                const optionValue = String(option?.value || '').toLowerCase();
                                return optionValue.includes(input.toLowerCase());
                            }}
                         >
                            {iconKeys.map(k => <Option key={k} value={k}>{k}</Option>)}
                         </Select>
                    </Form.Item>
                    <Form.Item name="orderNum" label="排序" rules={[{ required: true, message: '请输入排序号' }]}>
                        <InputNumber style={{ width: '100%' }} min={0} />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default MenuPage;
