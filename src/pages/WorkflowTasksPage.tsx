import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getTasksByAssignee, claimTask, completeTask, unclaimTask } from '../api/workflow'; // 导入 Workflow API

interface TaskResponse {
  id: string;
  name: string;
  assignee: string;
  owner: string | null;
  createTime: string;
  dueDate: string | null;
  followUpDate: string | null;
  description: string | null;
  priority: string;
  processInstanceId: string;
  processDefinitionId: string;
  taskDefinitionKey: string;
  tenantId: string;
  variables: { [key: string]: any };
}

const WorkflowTasksPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, getAuthenticatedAxios } = useAuth();
  const [tasks, setTasks] = useState<TaskResponse[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = async () => {
    if (!isAuthenticated || !user || !user.username || !user.tenantId) {
      setLoading(false);
      setError("User not authenticated, username or tenant ID not found.");
      return;
    }

    try {
      setLoading(true);
      const authenticatedAxios = getAuthenticatedAxios();
      const fetchedTasks = await getTasksByAssignee(authenticatedAxios, user.username, user.tenantId);
      setTasks(fetchedTasks);
    } catch (err: any) {
      console.error("Failed to fetch workflow tasks:", err);
      setError(err.response?.data?.message || "Failed to fetch workflow tasks.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [isAuthenticated, user, getAuthenticatedAxios]); // 依赖项

  const handleClaim = async (taskId: string) => {
    if (!user || !user.username) return;
    try {
      const authenticatedAxios = getAuthenticatedAxios();
      await claimTask(authenticatedAxios, { taskId, assignee: user.username });
      alert('Task claimed successfully!');
      fetchTasks(); // 刷新任务列表
    } catch (err: any) {
      console.error("Failed to claim task:", err);
      alert(err.response?.data?.message || 'Failed to claim task.');
    }
  };

  const handleComplete = async (taskId: string) => {
    try {
      const authenticatedAxios = getAuthenticatedAxios();
      // 可以在这里弹出一个模态框，让用户输入完成任务所需的变量
      const variables = {
        // 例如：approved: true, comments: "Looks good."
      };
      await completeTask(authenticatedAxios, { taskId, variables });
      alert('Task completed successfully!');
      fetchTasks(); // 刷新任务列表
    } catch (err: any) {
      console.error("Failed to complete task:", err);
      alert(err.response?.data?.message || 'Failed to complete task.');
    }
  };

  const handleUnclaim = async (taskId: string) => {
    try {
      const authenticatedAxios = getAuthenticatedAxios();
      await unclaimTask(authenticatedAxios, taskId);
      alert('Task unclaimed successfully!');
      fetchTasks(); // 刷新任务列表
    } catch (err: any) {
      console.error("Failed to unclaim task:", err);
      alert(err.response?.data?.message || 'Failed to unclaim task.');
    }
  };

  const handleBackToDashboard = () => {
    navigate('/dashboard');
  };

  if (loading) {
    return (
      <div style={{ padding: '20px', maxWidth: '800px', margin: '50px auto', border: '1px solid #ccc', borderRadius: '8px' }}>
        <h2>Workflow Tasks</h2>
        <p>Loading tasks...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '20px', maxWidth: '800px', margin: '50px auto', border: '1px solid #ccc', borderRadius: '8px' }}>
        <h2>Workflow Tasks</h2>
        <p style={{ color: 'red' }}>Error: {error}</p>
        <button onClick={handleBackToDashboard} style={{ padding: '8px 15px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
          Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '50px auto', border: '1px solid #ccc', borderRadius: '8px' }}>
      <h2>Workflow Tasks</h2>
      <button onClick={handleBackToDashboard} style={{ marginBottom: '20px', padding: '8px 15px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
        Back to Dashboard
      </button>

      {tasks.length === 0 ? (
        <p>No workflow tasks assigned to you.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '20px' }}>
          <thead>
            <tr style={{ backgroundColor: '#f2f2f2' }}>
              <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Task ID</th>
              <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Task Name</th>
              <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Assignee</th>
              <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Process Instance ID</th>
              <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Create Time</th>
              <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Variables</th>
              <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((task) => (
              <tr key={task.id}>
                <td style={{ border: '19x solid #ddd', padding: '8px' }}>{task.id}</td>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>{task.name}</td>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>{task.assignee || 'Unassigned'}</td>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>{task.processInstanceId}</td>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>{new Date(task.createTime).toLocaleString()}</td>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                  {task.variables && Object.keys(task.variables).length > 0 ? (
                    <ul>
                      {Object.entries(task.variables).map(([key, value]) => (
                        <li key={key}>{key}: {JSON.stringify(value)}</li>
                      ))}
                    </ul>
                  ) : 'N/A'}
                </td>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                  {task.assignee === user?.username ? (
                    <>
                      <button onClick={() => handleComplete(task.id)} style={{ marginRight: '5px', padding: '5px 10px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer' }}>
                        Complete
                      </button>
                      <button onClick={() => handleUnclaim(task.id)} style={{ padding: '5px 10px', backgroundColor: '#ffc107', color: 'black', border: 'none', borderRadius: '3px', cursor: 'pointer' }}>
                        Unclaim
                      </button>
                    </>
                  ) : (
                    <button onClick={() => handleClaim(task.id)} style={{ padding: '5px 10px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer' }}>
                      Claim
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default WorkflowTasksPage;
