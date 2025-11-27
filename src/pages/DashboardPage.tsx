import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const DashboardPage: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '50px auto', border: '1px solid #ccc', borderRadius: '8px' }}>
      <h2>Dashboard</h2>
      {user ? (
        <div>
          <p>Welcome, {user.username}!</p>
          <p>Your roles: {user.roles ? user.roles.join(', ') : 'None'}</p>
          <button onClick={() => navigate('/lims-samples')} style={{ marginRight: '10px', padding: '8px 15px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
            View LIMS Samples
          </button>
          <button onClick={() => navigate('/workflow-tasks')} style={{ marginRight: '10px', padding: '8px 15px', backgroundColor: '#ffc107', color: 'black', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
            View Workflow Tasks
          </button>
          <button onClick={handleLogout} style={{ padding: '8px 15px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
            Logout
          </button>
        </div>
      ) : (
        <p>You are not logged in.</p>
      )}
    </div>
  );
};

export default DashboardPage;
