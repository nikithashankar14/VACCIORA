/**
 * api.js
 * Centralized API client for communicating with the Vacciora backend.
 */

const API_BASE = 'http://localhost:5000/api';

export async function apiRequest(endpoint, options = {}) {
  const token = localStorage.getItem('vacciora_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {})
  };

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers
  });

  // If unauthorized, clear token if session expired
  if (response.status === 401 && !endpoint.includes('/auth/login')) {
    localStorage.removeItem('vacciora_token');
    localStorage.removeItem('vacciora_user');
    if (!window.location.pathname.includes('/login') && window.location.pathname !== '/') {
      window.location.href = '/login';
    }
  }

  // Handle blob responses (e.g. PDF certificates)
  if (options.isBlob) {
    if (!response.ok) {
      throw new Error(`Download failed with HTTP ${response.status}`);
    }
    return response.blob();
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const errorMsg = data.message || (data.errors ? data.errors.map(e => e.msg).join(', ') : 'Request failed');
    const err = new Error(errorMsg);
    err.code = data.code;
    err.data = data;
    throw err;
  }

  return data;
}

// Authentication & Profile APIs
export const authApi = {
  login: (identifier, password) => 
    apiRequest('/auth/login', { method: 'POST', body: JSON.stringify({ identifier, password }) }),
  
  register: (payload) => 
    apiRequest('/auth/register', { method: 'POST', body: JSON.stringify(payload) }),
  
  requestAccess: (payload) => 
    apiRequest('/auth/access-requests', { method: 'POST', body: JSON.stringify(payload) }),
  
  getMe: () => 
    apiRequest('/auth/me'),
  
  changePassword: (currentPassword, newPassword) => 
    apiRequest('/auth/change-password', { method: 'POST', body: JSON.stringify({ currentPassword, newPassword }) }),
  
  updateNotificationPreferences: (preferences) => 
    apiRequest('/auth/notification-preferences', { method: 'PATCH', body: JSON.stringify(preferences) }),

  recordConsent: () => 
    apiRequest('/auth/consent', { method: 'POST' })
};

// Children & Immunization Timeline APIs
export const childrenApi = {
  getMine: () => 
    apiRequest('/children/mine'),
  
  getById: (id) => 
    apiRequest(`/children/${id}`),
  
  getTimeline: (id) => 
    apiRequest(`/children/${id}/timeline`),
  
  createBirthRecord: (payload) => 
    apiRequest('/children/birth-record', { method: 'POST', body: JSON.stringify(payload) }),
  
  createManual: (payload) => 
    apiRequest('/children/manual', { method: 'POST', body: JSON.stringify(payload) }),
  
  linkChild: (childUid, guardianMobileAtBirth) => 
    apiRequest('/children/link', { method: 'POST', body: JSON.stringify({ childUid, guardianMobileAtBirth }) }),
  
  search: (query) => 
    apiRequest(`/children/search?query=${encodeURIComponent(query || '')}`)
};

// Vaccination Records & AEFI APIs
export const recordsApi = {
  logRecord: (payload) => 
    apiRequest('/records', { method: 'POST', body: JSON.stringify(payload) }),
  
  verifyRecord: (id, action, remarks) => 
    apiRequest(`/records/${id}/verify`, { method: 'POST', body: JSON.stringify({ action, remarks }) }),
  
  getChildRecords: (childId) => 
    apiRequest(`/records/child/${childId}`),
  
  submitAefi: (recordId, payload) => 
    apiRequest(`/records/${recordId}/aefi`, { method: 'POST', body: JSON.stringify(payload) })
};

// Schedule & AI Risk APIs
export const scheduleApi = {
  getUipSchedule: () => 
    apiRequest('/schedule'),
  
  getNextDue: (childId) => 
    apiRequest(`/schedule/next-due/${childId}`)
};

export const riskApi = {
  getPrediction: (childId) => 
    apiRequest(`/risk/${childId}`)
};

// Reminders & Notifications APIs
export const remindersApi = {
  getChildReminders: (childId) => 
    apiRequest(`/reminders/${childId}`),
  
  sendReminder: (childId, scheduleId = null, customMessage = null) => 
    apiRequest('/reminders/send', { method: 'POST', body: JSON.stringify({ childId, scheduleId, customMessage }) }),
  
  acknowledge: (id, method) => 
    apiRequest(`/reminders/${id}/acknowledge`, { method: 'PATCH', body: JSON.stringify({ method }) })
};

// Certificates & QR APIs
export const certificatesApi = {
  generate: (childId) => 
    apiRequest(`/certificates/${childId}/generate`, { method: 'POST' }),
  
  getForChild: (childId) => 
    apiRequest(`/certificates/child/${childId}`),
  
  downloadPdf: (certificateId) => 
    apiRequest(`/certificates/${certificateId}/download`, { isBlob: true }),
  
  verify: (identifier) => 
    apiRequest(`/certificates/verify/${encodeURIComponent(identifier)}`)
};

export const qrApi = {
  generatePass: (childId) => 
    apiRequest(`/qr/${childId}/generate`, { method: 'POST' }),
  
  resolvePass: (tokenValue) => 
    apiRequest('/qr/resolve', { method: 'POST', body: JSON.stringify({ tokenValue }) })
};

// Admin & Supervision APIs
export const adminApi = {
  getAnalytics: () => 
    apiRequest('/admin/analytics'),
  
  getNotificationHealth: () => 
    apiRequest('/admin/notifications/health'),
  
  getNotificationHistory: (page = 1, channel = 'all', deliveryMode = 'all') => 
    apiRequest(`/admin/notifications?page=${page}&channel=${channel}&deliveryMode=${deliveryMode}`),
  
  getAccessRequests: () => 
    apiRequest('/auth/admin/access-requests'),
  
  reviewAccessRequest: (id, action) => 
    apiRequest(`/auth/admin/access-requests/${id}`, { method: 'PATCH', body: JSON.stringify({ action }) }),
  
  getFacilities: () => 
    apiRequest('/admin/facilities'),
  
  createFacility: (payload) => 
    apiRequest('/admin/facilities', { method: 'POST', body: JSON.stringify(payload) }),
  
  updateFacility: (id, payload) => 
    apiRequest(`/admin/facilities/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  
  getDuplicates: () => 
    apiRequest('/admin/duplicates'),
  
  resolveDuplicate: (id, resolution) => 
    apiRequest(`/admin/duplicates/${id}`, { method: 'PATCH', body: JSON.stringify({ resolution }) }),
  
  getAuditLogs: () => 
    apiRequest('/admin/audit-logs'),
  
  getUsers: () => 
    apiRequest('/admin/users')
};
