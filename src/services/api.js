const API_BASE = import.meta.env.VITE_API_URL || '/api';

async function fetchAPI(endpoint, options = {}) {
  const token = localStorage.getItem('sara_token');
  const headers = { 
    'Content-Type': 'application/json',
    ...options.headers 
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });
  
  if (res.status === 401) {
    localStorage.removeItem('sara_token');
    localStorage.removeItem('sara_user');
    if (window.location.pathname !== '/login' && window.location.pathname !== '/register-nurse') {
      window.location.href = '/login';
    }
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error || 'Request failed');
  }
  return res.json();
}

export const authAPI = {
  login: (credentials) => fetchAPI('/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),
  register: (data) => fetchAPI('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
};

const json = (method, data) => ({ method, body: JSON.stringify(data) });

export const patientAPI = {
  getAll: (q) => fetchAPI(`/patients${q ? `?q=${encodeURIComponent(q)}` : ''}`),
  getDashboard: (date) => fetchAPI(`/patients/dashboard${date ? `?date=${date}` : ''}`),
  getReports: (from, to) => fetchAPI(`/patients/reports?from=${from}&to=${to}`),
  getById: (id) => fetchAPI(`/patients/${id}`),
  create: (data) => fetchAPI('/patients', json('POST', data)),
  update: (id, data) => fetchAPI(`/patients/${id}`, json('PUT', data)),
  delete: (id) => fetchAPI(`/patients/${id}`, { method: 'DELETE' }),
};

export const taskAPI = {
  getById: (id) => fetchAPI(`/tasks/${id}`),
  create: (data) => fetchAPI('/tasks', json('POST', data)),
  reschedule: (id, scheduledAt) => fetchAPI(`/tasks/${id}`, json('PUT', { scheduledAt })),
  delete: (id) => fetchAPI(`/tasks/${id}`, { method: 'DELETE' }),
};

export const assessmentAPI = {
  create: (data) => fetchAPI('/assessments', json('POST', data)),
};

export const ambulationAPI = {
  create: (data) => fetchAPI('/ambulations', json('POST', data)),
};

export const incidentAPI = {
  close: (id, closeNote) => fetchAPI(`/incidents/${id}/close`, json('PUT', { closeNote })),
};

export const checklistAPI = {
  getAll: (all) => fetchAPI(`/checklist${all ? '?all=1' : ''}`),
  update: (id, data) => fetchAPI(`/checklist/${id}`, json('PUT', data)),
  create: (data) => fetchAPI('/checklist', json('POST', data)),
};

export const auditAPI = {
  getAll: () => fetchAPI('/audit'),
};

export const notificationAPI = {
  getAll: () => fetchAPI('/notifications'),
  getUnreadCount: () => fetchAPI('/notifications/unread-count'),
  markRead: (id) => fetchAPI(`/notifications/${id}/read`, { method: 'PUT' }),
  markAllRead: () => fetchAPI('/notifications/read-all', { method: 'PUT' }),
};
