// frontend/src/pages/RFPDetail.js
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Send, RefreshCw, BarChart3, ArrowLeft, Plus, X } from 'lucide-react';
import { rfpAPI, vendorAPI, proposalAPI } from '../services/api';

function RFPDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [rfp, setRfp] = useState(null);
  const [vendors, setVendors] = useState([]);
  const [selectedVendors, setSelectedVendors] = useState([]);
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [checking, setChecking] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualProposal, setManualProposal] = useState({
    vendorId: '',
    emailSubject: '',
    emailBody: ''
  });

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      const [rfpRes, vendorsRes] = await Promise.all([
        rfpAPI.getById(id),
        vendorAPI.getAll(),
      ]);

      setRfp(rfpRes.data.rfp);
      setVendors(vendorsRes.data.vendors);

      // Fetch proposals if RFP has been sent
      if (rfpRes.data.rfp.status === 'sent') {
        try {
          const proposalsRes = await proposalAPI.getByRFP(id);
          setProposals(proposalsRes.data.proposals);
        } catch (err) {
          // No proposals yet
        }
      }

      setLoading(false);
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to load RFP details' });
      setLoading(false);
    }
  };

  const handleVendorToggle = (vendorId) => {
    setSelectedVendors(prev =>
      prev.includes(vendorId)
        ? prev.filter(id => id !== vendorId)
        : [...prev, vendorId]
    );
  };

  const handleSendRFP = async () => {
    if (selectedVendors.length === 0) {
      setMessage({ type: 'error', text: 'Please select at least one vendor' });
      return;
    }

    setSending(true);
    setMessage({ type: '', text: '' });

    try {
      await rfpAPI.sendToVendors(id, selectedVendors);
      setMessage({ type: 'success', text: 'RFP sent successfully to selected vendors!' });
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to send RFP. Please try again.' });
      setSending(false);
    }
  };

  const handleCheckResponses = async () => {
    setChecking(true);
    setMessage({ type: '', text: '' });

    try {
      const response = await proposalAPI.checkResponses(id);
      setMessage({ 
        type: response.data.proposals.length > 0 ? 'success' : 'info',
        text: response.data.message || 'Checked for new responses' 
      });
      
      // Refresh proposals
      const proposalsRes = await proposalAPI.getByRFP(id);
      setProposals(proposalsRes.data.proposals);
      setChecking(false);
    } catch (err) {
      setMessage({ 
        type: 'error', 
        text: 'Unable to check emails. Try adding proposals manually instead.' 
      });
      setChecking(false);
    }
  };

  const handleManualProposalSubmit = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });

    try {
      await proposalAPI.createManual({
        rfpId: parseInt(id),
        vendorId: parseInt(manualProposal.vendorId),
        emailSubject: manualProposal.emailSubject,
        emailBody: manualProposal.emailBody
      });

      setMessage({ type: 'success', text: 'Proposal added successfully!' });
      setShowManualModal(false);
      setManualProposal({ vendorId: '', emailSubject: '', emailBody: '' });
      
      // Refresh proposals
      const proposalsRes = await proposalAPI.getByRFP(id);
      setProposals(proposalsRes.data.proposals);
    } catch (err) {
      setMessage({ 
        type: 'error', 
        text: err.response?.data?.error || 'Failed to add proposal' 
      });
    }
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
      </div>
    );
  }

  if (!rfp) {
    return <div className="alert alert-error">RFP not found</div>;
  }

  const requirements = typeof rfp.requirements === 'string' 
    ? JSON.parse(rfp.requirements) 
    : rfp.requirements;

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <button onClick={() => navigate('/rfps')} className="btn btn-secondary" style={{ marginBottom: '1rem' }}>
          <ArrowLeft size={18} />
          Back to RFPs
        </button>
        <h1>{rfp.title}</h1>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginTop: '0.5rem' }}>
          <span className={`badge badge-${rfp.status}`}>
            {rfp.status}
          </span>
          <span style={{ color: '#6b7280' }}>
            Created: {new Date(rfp.created_at).toLocaleString()}
          </span>
        </div>
      </div>

      {message.text && (
        <div className={`alert alert-${message.type}`}>
          {message.text}
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <h2>RFP Details</h2>
        </div>
        
        <div style={{ display: 'grid', gap: '1.5rem' }}>
          <div>
            <h3 style={{ fontSize: '1rem', color: '#6b7280', marginBottom: '0.5rem' }}>Description</h3>
            <p style={{ color: '#1f2937' }}>{rfp.description}</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <div>
              <h3 style={{ fontSize: '1rem', color: '#6b7280', marginBottom: '0.5rem' }}>Budget</h3>
              <p style={{ fontSize: '1.25rem', fontWeight: '600', color: '#1f2937' }}>
                ${parseFloat(rfp.budget || 0).toLocaleString()}
              </p>
            </div>
            <div>
              <h3 style={{ fontSize: '1rem', color: '#6b7280', marginBottom: '0.5rem' }}>Delivery Deadline</h3>
              <p style={{ fontSize: '1.25rem', fontWeight: '600', color: '#1f2937' }}>
                {rfp.delivery_deadline ? new Date(rfp.delivery_deadline).toLocaleDateString() : 'Not specified'}
              </p>
            </div>
            <div>
              <h3 style={{ fontSize: '1rem', color: '#6b7280', marginBottom: '0.5rem' }}>Payment Terms</h3>
              <p style={{ fontSize: '1.25rem', fontWeight: '600', color: '#1f2937' }}>
                {rfp.payment_terms || 'Not specified'}
              </p>
            </div>
            <div>
              <h3 style={{ fontSize: '1rem', color: '#6b7280', marginBottom: '0.5rem' }}>Warranty</h3>
              <p style={{ fontSize: '1.25rem', fontWeight: '600', color: '#1f2937' }}>
                {rfp.warranty_terms || 'Not specified'}
              </p>
            </div>
          </div>

          <div>
            <h3 style={{ fontSize: '1rem', color: '#6b7280', marginBottom: '0.5rem' }}>Required Items</h3>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Quantity</th>
                    <th>Specifications</th>
                  </tr>
                </thead>
                <tbody>
                  {requirements.items?.map((item, index) => (
                    <tr key={index}>
                      <td>{item.name}</td>
                      <td>{item.quantity}</td>
                      <td>{item.specifications}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {rfp.status === 'draft' && (
        <div className="card">
          <div className="card-header">
            <h2>Send to Vendors</h2>
          </div>
          
          <p style={{ marginBottom: '1rem', color: '#6b7280' }}>
            Select vendors to send this RFP to:
          </p>

          <div style={{ display: 'grid', gap: '0.75rem', marginBottom: '1.5rem' }}>
            {vendors.map((vendor) => (
              <label
                key={vendor.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '1rem',
                  background: selectedVendors.includes(vendor.id) ? '#dbeafe' : '#f9fafb',
                  border: `2px solid ${selectedVendors.includes(vendor.id) ? '#2563eb' : '#e5e7eb'}`,
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                <input
                  type="checkbox"
                  checked={selectedVendors.includes(vendor.id)}
                  onChange={() => handleVendorToggle(vendor.id)}
                  style={{ marginRight: '1rem', width: '18px', height: '18px', cursor: 'pointer' }}
                />
                <div>
                  <div style={{ fontWeight: '600', color: '#1f2937' }}>{vendor.name}</div>
                  <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>{vendor.email}</div>
                </div>
              </label>
            ))}
          </div>

          {vendors.length === 0 && (
            <p style={{ color: '#6b7280', textAlign: 'center', padding: '1rem' }}>
              No vendors available. <Link to="/vendors">Add vendors first</Link>
            </p>
          )}

          <button
            onClick={handleSendRFP}
            className="btn btn-primary"
            disabled={sending || selectedVendors.length === 0}
          >
            {sending ? (
              <>
                <div className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }}></div>
                Sending...
              </>
            ) : (
              <>
                <Send size={18} />
                Send RFP to {selectedVendors.length} vendor{selectedVendors.length !== 1 ? 's' : ''}
              </>
            )}
          </button>
        </div>
      )}

      {rfp.status === 'sent' && (
        <div className="card">
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2>Vendor Proposals ({proposals.length})</h2>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <button onClick={handleCheckResponses} className="btn btn-secondary" disabled={checking}>
                {checking ? (
                  <>
                    <div className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }}></div>
                    Checking...
                  </>
                ) : (
                  <>
                    <RefreshCw size={18} />
                    Check Emails
                  </>
                )}
              </button>
              <button onClick={() => setShowManualModal(true)} className="btn btn-secondary">
                <Plus size={18} />
                Add Manually
              </button>
              {proposals.length > 0 && (
                <Link to={`/rfps/${id}/compare`} className="btn btn-primary">
                  <BarChart3 size={18} />
                  Compare Proposals
                </Link>
              )}
            </div>
          </div>

          {proposals.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem' }}>
              <p style={{ color: '#6b7280', marginBottom: '1rem' }}>
                No proposals received yet.
              </p>
              <button onClick={() => setShowManualModal(true)} className="btn btn-primary">
                <Plus size={18} />
                Add Proposal Manually
              </button>
            </div>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Vendor</th>
                    <th>Total Price</th>
                    <th>Delivery Time</th>
                    <th>Warranty</th>
                    <th>AI Score</th>
                    <th>Received</th>
                  </tr>
                </thead>
                <tbody>
                  {proposals.map((proposal) => (
                    <tr key={proposal.id}>
                      <td style={{ fontWeight: '600' }}>{proposal.vendor_name}</td>
                      <td>${parseFloat(proposal.total_price || 0).toLocaleString()}</td>
                      <td>{proposal.delivery_time}</td>
                      <td>{proposal.warranty}</td>
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
                      <td>{new Date(proposal.received_at).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Manual Proposal Modal */}
      {showManualModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '2rem',
            maxWidth: '600px',
            width: '90%',
            maxHeight: '90vh',
            overflow: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.5rem', color: '#1f2937' }}>Add Proposal Manually</h2>
              <button
                onClick={() => setShowManualModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleManualProposalSubmit}>
              <div className="form-group">
                <label>Select Vendor *</label>
                <select
                  className="form-control"
                  value={manualProposal.vendorId}
                  onChange={(e) => setManualProposal({...manualProposal, vendorId: e.target.value})}
                  required
                >
                  <option value="">Choose a vendor...</option>
                  {vendors.map(vendor => (
                    <option key={vendor.id} value={vendor.id}>{vendor.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Email Subject</label>
                <input
                  type="text"
                  className="form-control"
                  value={manualProposal.emailSubject}
                  onChange={(e) => setManualProposal({...manualProposal, emailSubject: e.target.value})}
                  placeholder="Re: RFP Response"
                />
              </div>

              <div className="form-group">
                <label>Proposal Details *</label>
                <textarea
                  className="form-control"
                  value={manualProposal.emailBody}
                  onChange={(e) => setManualProposal({...manualProposal, emailBody: e.target.value})}
                  rows={10}
                  required
                  placeholder="Example:&#10;&#10;Thank you for your RFP. Our proposal:&#10;&#10;Laptops: 20 units at $950 each = $19,000&#10;Monitors: 15 units at $450 each = $6,750&#10;&#10;Total Price: $25,750&#10;Delivery: 3 weeks&#10;Warranty: 3 years&#10;Payment Terms: Net 30"
                />
                <small style={{ color: '#6b7280', display: 'block', marginTop: '0.5rem' }}>
                  Paste the vendor's proposal text. AI will automatically extract pricing, delivery, and other details.
                </small>
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                  Add Proposal
                </button>
                <button
                  type="button"
                  onClick={() => setShowManualModal(false)}
                  className="btn btn-secondary"
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default RFPDetail;