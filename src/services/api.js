// frontend/src/services/api.js
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// RFP APIs
export const rfpAPI = {
  create: (data) => api.post('/rfps', data),
  getAll: () => api.get('/rfps'),
  getById: (id) => api.get(`/rfps/${id}`),
  sendToVendors: (id, vendorIds) => api.post(`/rfps/${id}/send`, { vendorIds }),
  getVendors: (id) => api.get(`/rfps/${id}/vendors`),
};

// Vendor APIs
export const vendorAPI = {
  create: (data) => api.post('/vendors', data),
  getAll: () => api.get('/vendors'),
  getById: (id) => api.get(`/vendors/${id}`),
  update: (id, data) => api.put(`/vendors/${id}`, data),
  delete: (id) => api.delete(`/vendors/${id}`),
};

// Proposal APIs
export const proposalAPI = {
  checkResponses: (rfpId) => api.post(`/proposals/check/${rfpId}`),
  getByRFP: (rfpId) => api.get(`/proposals/rfp/${rfpId}`),
  getById: (id) => api.get(`/proposals/${id}`),
  compare: (rfpId) => api.post(`/proposals/compare/${rfpId}`),
  createManual: (data) => api.post('/proposals/manual', data),
};

export default api;