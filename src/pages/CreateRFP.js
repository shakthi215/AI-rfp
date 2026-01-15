// frontend/src/pages/CreateRFP.js
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, CheckCircle } from 'lucide-react';
import { rfpAPI } from '../services/api';

function CreateRFP() {
  const navigate = useNavigate();
  const [naturalLanguageInput, setNaturalLanguageInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const exampleInputs = [
    "I need to procure laptops and monitors for our new office. Budget is $50,000 total. Need delivery within 30 days. We need 20 laptops with 16GB RAM and 15 monitors 27-inch. Payment terms should be net 30, and we need at least 1 year warranty.",
    "Looking to purchase office furniture for 50 employees. Budget: $30,000. Need desks, chairs, and filing cabinets. Delivery needed by end of next month. Want ergonomic chairs with 5-year warranty. Payment: net 60.",
    "Need cloud storage solution for 100 users. Annual budget $15,000. Need at least 1TB per user, 99.9% uptime SLA, 24/7 support. Contract period: 2 years. Payment quarterly."
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      const response = await rfpAPI.create({ naturalLanguageInput });
      setSuccess(true);
      
      setTimeout(() => {
        navigate(`/rfps/${response.data.rfp.id}`);
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create RFP. Please try again.');
      setLoading(false);
    }
  };

  const useExample = (example) => {
    setNaturalLanguageInput(example);
  };

  return (
    <div>
      <div className="page-header">
        <h1>Create New RFP</h1>
        <p>Describe what you need in natural language and AI will structure it for you</p>
      </div>

      {error && (
        <div className="alert alert-error">
          {error}
        </div>
      )}

      {success && (
        <div className="alert alert-success">
          <CheckCircle size={20} style={{ marginRight: '0.5rem' }} />
          RFP created successfully! Redirecting...
        </div>
      )}

      <div className="card">
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>
              <Sparkles size={18} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />
              Describe your procurement needs
            </label>
            <textarea
              className="form-control"
              placeholder="Example: I need to procure 50 laptops with 16GB RAM, Core i7 processor, and 15-inch display. Budget is $60,000. Delivery needed within 45 days. Payment terms: Net 30. Warranty: Minimum 2 years..."
              value={naturalLanguageInput}
              onChange={(e) => setNaturalLanguageInput(e.target.value)}
              rows={8}
              required
              disabled={loading}
            />
            <small style={{ color: '#6b7280', display: 'block', marginTop: '0.5rem' }}>
              Include details like: items needed, quantities, specifications, budget, delivery timeline, payment terms, and warranty requirements.
            </small>
          </div>

          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading || !naturalLanguageInput.trim()}
            >
              {loading ? (
                <>
                  <div className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }}></div>
                  Processing with AI...
                </>
              ) : (
                <>
                  <Sparkles size={18} />
                  Create RFP with AI
                </>
              )}
            </button>

            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => navigate('/rfps')}
              disabled={loading}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>

      <div className="card" style={{ marginTop: '2rem' }}>
        <div className="card-header">
          <h2>Example Inputs</h2>
        </div>
        <p style={{ marginBottom: '1rem', color: '#6b7280' }}>
          Click on any example below to use it as a template:
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {exampleInputs.map((example, index) => (
            <div
              key={index}
              style={{
                padding: '1rem',
                background: '#f9fafb',
                borderRadius: '8px',
                border: '1px solid #e5e7eb',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onClick={() => useExample(example)}
              onMouseEnter={(e) => e.currentTarget.style.background = '#f3f4f6'}
              onMouseLeave={(e) => e.currentTarget.style.background = '#f9fafb'}
            >
              <p style={{ fontSize: '0.875rem', color: '#4b5563', margin: 0 }}>
                {example}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default CreateRFP;