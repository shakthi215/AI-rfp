// frontend/src/pages/RFPList.js
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Eye } from 'lucide-react';
import { rfpAPI } from '../services/api';

function RFPList() {
  const [rfps, setRfps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchRFPs();
  }, []);

  const fetchRFPs = async () => {
    try {
      const response = await rfpAPI.getAll();
      setRfps(response.data.rfps);
      setLoading(false);
    } catch (err) {
      setError('Failed to fetch RFPs');
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>All RFPs</h1>
          <p>Manage your Requests for Proposal</p>
        </div>
        <Link to="/rfps/create" className="btn btn-primary">
          <Plus size={18} />
          Create New RFP
        </Link>
      </div>

      {error && (
        <div className="alert alert-error">
          {error}
        </div>
      )}

      <div className="card">
        {rfps.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>
            <p style={{ fontSize: '1.125rem', marginBottom: '1rem' }}>No RFPs created yet</p>
            <Link to="/rfps/create" className="btn btn-primary">
              <Plus size={18} />
              Create Your First RFP
            </Link>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Title</th>
                  <th>Budget</th>
                  <th>Delivery Deadline</th>
                  <th>Status</th>
                  <th>Created Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rfps.map((rfp) => (
                  <tr key={rfp.id}>
                    <td>#{rfp.id}</td>
                    <td style={{ fontWeight: '500', color: '#1f2937' }}>{rfp.title}</td>
                    <td>${parseFloat(rfp.budget || 0).toLocaleString()}</td>
                    <td>
                      {rfp.delivery_deadline 
                        ? new Date(rfp.delivery_deadline).toLocaleDateString()
                        : 'Not specified'}
                    </td>
                    <td>
                      <span className={`badge badge-${rfp.status}`}>
                        {rfp.status}
                      </span>
                    </td>
                    <td>{new Date(rfp.created_at).toLocaleDateString()}</td>
                    <td>
                      <Link to={`/rfps/${rfp.id}`} className="btn btn-secondary" style={{ padding: '0.5rem 1rem' }}>
                        <Eye size={16} />
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default RFPList;