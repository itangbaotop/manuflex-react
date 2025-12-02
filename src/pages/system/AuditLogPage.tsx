import React, { useEffect, useState } from 'react';
import { Table, Card, Form, Input, Select, Button, Tag, Drawer, Descriptions, Space } from 'antd';
import { SearchOutlined, ReloadOutlined, EyeOutlined } from '@ant-design/icons';
import { useAuth } from '../../context/AuthContext';
import { getOperationLogs } from '../../api/log';
import type { OperationLog } from '../../api/log';

const { Option } = Select;

const AuditLogPage: React.FC = () => {
    const { getAuthenticatedAxios } = useAuth();
    const [logs, setLogs] = useState<OperationLog[]>([]);
    const [loading, setLoading] = useState(false);
    const [total, setTotal] = useState(0);
    const [pagination, setPagination] = useState({ current: 1, pageSize: 20 });
    
    // 搜索表单
    const [searchForm] = Form.useForm();

    // 详情抽屉
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [currentLog, setCurrentLog] = useState<OperationLog | null>(null);

    const fetchLogs = async (page = 1, size = 20) => {
        setLoading(true);
        try {
            const values = await searchForm.validateFields();
            const res: any = await getOperationLogs(getAuthenticatedAxios(), {
                page: page - 1, // 后端 Page 从 0 开始
                size: size,
                ...values
            });
            setLogs(res.content);
            setTotal(res.totalElements);
            setPagination({ current: page, pageSize: size });
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleSearch = () => fetchLogs(1, pagination.pageSize);
    const handleReset = () => {
        searchForm.resetFields();
        fetchLogs(1, pagination.pageSize);
    };

    const showDetail = (record: OperationLog) => {
        setCurrentLog(record);
        setIsDrawerOpen(true);
    };

    const columns = [
        { title: '操作人', dataIndex: 'username', width: 120 },
        { title: '模块', dataIndex: 'module', width: 120 },
        { title: '动作', dataIndex: 'action', width: 150 },
        { 
            title: '状态', 
            dataIndex: 'status', 
            width: 100,
            render: (status: string) => (
                <Tag color={status === 'SUCCESS' ? 'green' : 'red'}>{status}</Tag>
            )
        },
        { title: 'IP', dataIndex: 'userIp', width: 120 },
        { title: '耗时 (ms)', dataIndex: 'executionTime', width: 100 },
        { title: '操作时间', dataIndex: 'createdAt', width: 180, render: (t: string) => new Date(t).toLocaleString() },
        {
            title: '操作',
            key: 'action',
            render: (_: any, r: OperationLog) => (
                <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => showDetail(r)}>
                    详情
                </Button>
            )
        }
    ];

    return (
        <div style={{ padding: 24 }}>
            <Card bordered={false}>
                <Form form={searchForm} layout="inline" style={{ marginBottom: 16 }}>
                    <Form.Item name="username" label="操作人">
                        <Input placeholder="输入账号" allowClear />
                    </Form.Item>
                    <Form.Item name="module" label="模块">
                        <Input placeholder="输入模块名" allowClear />
                    </Form.Item>
                    <Form.Item name="status" label="状态">
                        <Select style={{ width: 120 }} allowClear>
                            <Option value="SUCCESS">成功</Option>
                            <Option value="FAIL">失败</Option>
                        </Select>
                    </Form.Item>
                    <Form.Item>
                        <Space>
                            <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>查询</Button>
                            <Button icon={<ReloadOutlined />} onClick={handleReset}>重置</Button>
                        </Space>
                    </Form.Item>
                </Form>

                <Table
                    rowKey="id"
                    columns={columns}
                    dataSource={logs}
                    loading={loading}
                    pagination={{
                        ...pagination,
                        total,
                        showSizeChanger: true,
                        onChange: (page, size) => fetchLogs(page, size)
                    }}
                />
            </Card>

            <Drawer
                title="日志详情"
                width={600}
                onClose={() => setIsDrawerOpen(false)}
                open={isDrawerOpen}
            >
                {currentLog && (
                    <Descriptions column={1} bordered>
                        <Descriptions.Item label="操作ID">{currentLog.id}</Descriptions.Item>
                        <Descriptions.Item label="操作人">{currentLog.username}</Descriptions.Item>
                        <Descriptions.Item label="IP地址">{currentLog.userIp}</Descriptions.Item>
                        <Descriptions.Item label="模块">{currentLog.module}</Descriptions.Item>
                        <Descriptions.Item label="动作">{currentLog.action}</Descriptions.Item>
                        <Descriptions.Item label="状态">
                            <Tag color={currentLog.status === 'SUCCESS' ? 'green' : 'red'}>{currentLog.status}</Tag>
                        </Descriptions.Item>
                        <Descriptions.Item label="耗时">{currentLog.executionTime} ms</Descriptions.Item>
                        <Descriptions.Item label="时间">{new Date(currentLog.createdAt).toLocaleString()}</Descriptions.Item>
                        <Descriptions.Item label="请求参数">
                            <pre style={{maxHeight: 200, overflow: 'auto', background: '#f5f5f5', padding: 8}}>
                                {currentLog.description}
                            </pre>
                        </Descriptions.Item>
                        {currentLog.status === 'FAIL' && (
                            <Descriptions.Item label="错误信息">
                                <span style={{color: 'red'}}>{currentLog.errorMsg}</span>
                            </Descriptions.Item>
                        )}
                    </Descriptions>
                )}
            </Drawer>
        </div>
    );
};

export default AuditLogPage;