// frontend/src/pages/Dashboard.js
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Users, CheckCircle, Clock } from 'lucide-react';
import { rfpAPI, vendorAPI, proposalAPI } from '../services/api';

function Dashboard() {
  const [stats, setStats] = useState({
    totalRFPs: 0,
    totalVendors: 0,
    activeRFPs: 0,
    proposalsReceived: 0,
  });
  const [recentRFPs, setRecentRFPs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [rfpsRes, vendorsRes] = await Promise.all([
        rfpAPI.getAll(),
        vendorAPI.getAll(),
      ]);

      const rfps = rfpsRes.data.rfps;
      const vendors = vendorsRes.data.vendors;

      // Get proposals for all RFPs
      let totalProposals = 0;
      for (const rfp of rfps) {
        try {
          const proposalsRes = await proposalAPI.getByRFP(rfp.id);
          totalProposals += proposalsRes.data.proposals.length;
        } catch (err) {
          // No proposals for this RFP
        }
      }

      setStats({
        totalRFPs: rfps.length,
        totalVendors: vendors.length,
        activeRFPs: rfps.filter(r => r.status === 'sent').length,
        proposalsReceived: totalProposals,
      });

      setRecentRFPs(rfps.slice(0, 5));
      setLoading(false);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
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
      <div className="page-header">
        <h1>Dashboard</h1>
        <p>Welcome to RFP Management System</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon blue">
            <FileText size={24} />
          </div>
          <div className="stat-info">
            <h3>Total RFPs</h3>
            <p>{stats.totalRFPs}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon green">
            <Users size={24} />
          </div>
          <div className="stat-info">
            <h3>Total Vendors</h3>
            <p>{stats.totalVendors}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon purple">
            <Clock size={24} />
          </div>
          <div className="stat-info">
            <h3>Active RFPs</h3>
            <p>{stats.activeRFPs}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon orange">
            <CheckCircle size={24} />
          </div>
          <div className="stat-info">
            <h3>Proposals Received</h3>
            <p>{stats.proposalsReceived}</p>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2>Recent RFPs</h2>
        </div>
        {recentRFPs.length === 0 ? (
          <p style={{ color: '#6b7280', textAlign: 'center', padding: '2rem' }}>
            No RFPs created yet. <Link to="/rfps/create">Create your first RFP</Link>
          </p>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Budget</th>
                  <th>Deadline</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {recentRFPs.map((rfp) => (
                  <tr key={rfp.id}>
                    <td>{rfp.title}</td>
                    <td>${parseFloat(rfp.budget || 0).toLocaleString()}</td>
                    <td>{rfp.delivery_deadline ? new Date(rfp.delivery_deadline).toLocaleDateString() : 'N/A'}</td>
                    <td>
                      <span className={`badge badge-${rfp.status}`}>
                        {rfp.status}
                      </span>
                    </td>
                    <td>{new Date(rfp.created_at).toLocaleDateString()}</td>
                    <td>
                      <Link to={`/rfps/${rfp.id}`} className="btn btn-secondary" style={{ padding: '0.5rem 1rem' }}>
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

export default Dashboard;