// frontend/src/pages/CompareProposals.js
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Trophy, TrendingUp, AlertCircle } from 'lucide-react';
import { proposalAPI, rfpAPI } from '../services/api';

function CompareProposals() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [rfp, setRfp] = useState(null);
  const [proposals, setProposals] = useState([]);
  const [comparison, setComparison] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchComparisonData();
  }, [id]);

  const fetchComparisonData = async () => {
    try {
      const [rfpRes, comparisonRes] = await Promise.all([
        rfpAPI.getById(id),
        proposalAPI.compare(id)
      ]);

      setRfp(rfpRes.data.rfp);
      setProposals(comparisonRes.data.proposals);
      setComparison(comparisonRes.data.comparison);
      setLoading(false);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load comparison data');
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

  if (error) {
    return (
      <div>
        <button onClick={() => navigate(`/rfps/${id}`)} className="btn btn-secondary" style={{ marginBottom: '1rem' }}>
          <ArrowLeft size={18} />
          Back to RFP
        </button>
        <div className="alert alert-error">{error}</div>
      </div>
    );
  }

  const recommendedVendor = proposals.find(p => p.vendor_id === comparison.recommended_vendor_id);

  return (
    <div>
      <button onClick={() => navigate(`/rfps/${id}`)} className="btn btn-secondary" style={{ marginBottom: '1rem' }}>
        <ArrowLeft size={18} />
        Back to RFP
      </button>

      <div className="page-header">
        <h1>Proposal Comparison</h1>
        <p>{rfp?.title}</p>
      </div>

      {/* Recommended Vendor */}
      <div className="card" style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: 'white' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
          <Trophy size={32} />
          <div>
            <h2 style={{ color: 'white', marginBottom: '0.25rem' }}>Recommended Vendor</h2>
            <p style={{ fontSize: '1.5rem', fontWeight: '700', margin: 0 }}>
              {recommendedVendor?.vendor_name}
            </p>
          </div>
        </div>
        <p style={{ fontSize: '1.125rem', lineHeight: '1.6', opacity: 0.95 }}>
          {comparison.recommendation_rationale}
        </p>
      </div>

      {/* AI Analysis Summary */}
      <div className="card">
        <div className="card-header">
          <h2>AI Analysis Summary</h2>
        </div>
        <p style={{ fontSize: '1.125rem', lineHeight: '1.75', color: '#1f2937' }}>
          {comparison.comparison_summary}
        </p>
      </div>

      {/* Rankings */}
      <div className="card">
        <div className="card-header">
          <h2>Vendor Rankings</h2>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {comparison.ranking.map((rank, index) => {
            const proposal = proposals.find(p => p.vendor_id === rank.vendor_id);
            const isWinner = rank.rank === 1;
            
            return (
              <div
                key={rank.vendor_id}
                style={{
                  padding: '1.5rem',
                  background: isWinner ? '#ecfdf5' : '#f9fafb',
                  border: `2px solid ${isWinner ? '#10b981' : '#e5e7eb'}`,
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '1.5rem'
                }}
              >
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    background: isWinner ? '#10b981' : '#6b7280',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.25rem',
                    fontWeight: '700',
                    flexShrink: 0
                  }}
                >
                  {rank.rank}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.5rem' }}>
                    <div>
                      <h3 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#1f2937', marginBottom: '0.25rem' }}>
                        {rank.vendor_name}
                        {isWinner && (
                          <Trophy size={20} style={{ marginLeft: '0.5rem', color: '#10b981', verticalAlign: 'middle' }} />
                        )}
                      </h3>
                      <div style={{ display: 'flex', gap: '1rem', fontSize: '0.875rem', color: '#6b7280' }}>
                        <span>Price: ${parseFloat(proposal?.total_price || 0).toLocaleString()}</span>
                        <span>•</span>
                        <span>Delivery: {proposal?.delivery_time}</span>
                        <span>•</span>
                        <span>Score: {rank.score}/100</span>
                      </div>
                    </div>
                  </div>
                  <p style={{ color: '#4b5563', lineHeight: '1.6', margin: 0 }}>
                    {rank.reason}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Key Insights */}
      <div className="card">
        <div className="card-header">
          <h2>Key Insights</h2>
        </div>
        <div style={{ display: 'grid', gap: '1rem' }}>
          {comparison.key_insights.map((insight, index) => (
            <div
              key={index}
              style={{
                display: 'flex',
                gap: '1rem',
                padding: '1rem',
                background: '#f9fafb',
                borderRadius: '8px',
                border: '1px solid #e5e7eb'
              }}
            >
              <TrendingUp size={20} style={{ color: '#2563eb', flexShrink: 0, marginTop: '0.25rem' }} />
              <p style={{ color: '#1f2937', lineHeight: '1.6', margin: 0 }}>
                {insight}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Detailed Proposal Comparison */}
      <div className="card">
        <div className="card-header">
          <h2>Detailed Comparison</h2>
        </div>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Vendor</th>
                <th>Total Price</th>
                <th>Delivery Time</th>
                <th>Warranty</th>
                <th>Payment Terms</th>
                <th>AI Score</th>
              </tr>
            </thead>
            <tbody>
              {proposals.map((proposal) => (
                <tr key={proposal.id} style={{ 
                  background: proposal.vendor_id === comparison.recommended_vendor_id ? '#ecfdf5' : 'transparent' 
                }}>
                  <td style={{ fontWeight: '600' }}>
                    {proposal.vendor_name}
                    {proposal.vendor_id === comparison.recommended_vendor_id && (
                      <Trophy size={16} style={{ marginLeft: '0.5rem', color: '#10b981', verticalAlign: 'middle' }} />
                    )}
                  </td>
                  <td>${parseFloat(proposal.total_price || 0).toLocaleString()}</td>
                  <td>{proposal.delivery_time}</td>
                  <td>{proposal.warranty}</td>
                  <td>{proposal.payment_terms}</td>
                  <td>
                    <span style={{
                      padding: '0.25rem 0.75rem',
                      borderRadius: '9999px',
                      background: proposal.ai_score >= 80 ? '#d1fae5' : proposal.ai_score >= 60 ? '#fef3c7' : '#fee2e2',
                      color: proposal.ai_score >= 80 ? '#065f46' : proposal.ai_score >= 60 ? '#92400e' : '#991b1b',
                      fontWeight: '600'
                    }}>
                      {parseFloat(proposal.ai_score || 0).toFixed(1)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default CompareProposals;