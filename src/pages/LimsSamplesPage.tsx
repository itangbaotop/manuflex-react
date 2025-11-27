import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getLimsSamples } from '../api/lims';

interface SampleResponse {
  id: number;
  sampleName: string;
  batchNumber: string;
  collectionDate: string;
  status: string;
  tenantId: string;
  createdAt: string;
  updatedAt: string;
  customFields: { [key: string]: any };
}

const LimsSamplesPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, getAuthenticatedAxios } = useAuth(); // 获取 getAuthenticatedAxios
  const [samples, setSamples] = useState<SampleResponse[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSamples = async () => {
      if (!isAuthenticated || !user || !user.tenantId) {
        setLoading(false);
        setError("User not authenticated or tenant ID not found.");
        return;
      }

      try {
        setLoading(true);
        const userTenantId = user.tenantId;
        const authenticatedAxios = getAuthenticatedAxios(); // 获取认证后的 Axios 实例
        const fetchedSamples = await getLimsSamples(authenticatedAxios, userTenantId); // 传递实例
        setSamples(fetchedSamples);
      } catch (err: any) {
        console.error("Failed to fetch LIMS samples:", err);
        setError(err.response?.data?.message || "Failed to fetch LIMS samples.");
      } finally {
        setLoading(false);
      }
    };

    fetchSamples();
  }, [isAuthenticated, user, getAuthenticatedAxios]); // 依赖项

  const handleBackToDashboard = () => {
    navigate('/dashboard');
  };

  if (loading) {
    return (
      <div style={{ padding: '20px', maxWidth: '800px', margin: '50px auto', border: '1px solid #ccc', borderRadius: '8px' }}>
        <h2>LIMS Samples</h2>
        <p>Loading samples...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '20px', maxWidth: '800px', margin: '50px auto', border: '1px solid #ccc', borderRadius: '8px' }}>
        <h2>LIMS Samples</h2>
        <p style={{ color: 'red' }}>Error: {error}</p>
        <button onClick={handleBackToDashboard} style={{ padding: '8px 15px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
          Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '50px auto', border: '1px solid #ccc', borderRadius: '8px' }}>
      <h2>LIMS Samples</h2>
      <button onClick={handleBackToDashboard} style={{ marginBottom: '20px', padding: '8px 15px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
        Back to Dashboard
      </button>

      {samples.length === 0 ? (
        <p>No LIMS samples found.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '20px' }}>
          <thead>
            <tr style={{ backgroundColor: '#f2f2f2' }}>
              <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>ID</th>
              <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Sample Name</th>
              <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Batch Number</th>
              <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Collection Date</th>
              <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Status</th>
              <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Tenant ID</th>
              <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Created At</th>
              <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Custom Fields</th>
            </tr>
          </thead>
          <tbody>
            {samples.map((sample) => (
              <tr key={sample.id}>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>{sample.id}</td>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>{sample.sampleName}</td>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>{sample.batchNumber}</td>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>{sample.collectionDate}</td>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>{sample.status}</td>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>{sample.tenantId}</td>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>{new Date(sample.createdAt).toLocaleString()}</td>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                  {sample.customFields && Object.keys(sample.customFields).length > 0 ? (
                    <ul>
                      {Object.entries(sample.customFields).map(([key, value]) => (
                        <li key={key}>{key}: {JSON.stringify(value)}</li>
                      ))}
                    </ul>
                  ) : 'N/A'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default LimsSamplesPage;
