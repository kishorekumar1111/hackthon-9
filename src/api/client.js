import axios from 'axios';

const client = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('ecr_token');
  if (token && !token.startsWith('mock_')) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

client.interceptors.response.use(
  (r) => r,
  (err) => {
    const token = localStorage.getItem('ecr_token');
    if (err.response?.status === 401 && token && !token.startsWith('mock_')) {
      localStorage.removeItem('ecr_token');
      localStorage.removeItem('ecr_user');
      if (window.location.pathname !== '/login') window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default client;

export const auth = {
  register: (data) => client.post('/auth/register', data),
  login: (data) => client.post('/auth/login', data),
  me: () => client.get('/auth/me'),
  seedDemo: () => client.post('/auth/seed-demo'),
  google: (data) => client.post('/auth/google', data),
};

export const doctors = {
  list: (params) => client.get('/doctors', { params }),
  get: (id) => client.get(`/doctors/${id}`),
  slots: (id, date) => client.get(`/doctors/${id}/slots`, { params: { appointment_date: date } }),
};

export const appointments = {
  create: (data) => client.post('/appointments', data),
  my: () => client.get('/appointments/my'),
  cancel: (id) => client.post(`/appointments/${id}/cancel`),
};

export const sessions = {
  start: (appointmentId) => client.post(`/sessions/start/${appointmentId}`),
  end: (sessionId) => client.post(`/sessions/${sessionId}/end`),
  byAppointment: (appointmentId) => client.get(`/sessions/by-appointment/${appointmentId}`),
  consent: (sessionId, consent) => client.post(`/sessions/${sessionId}/consent`, null, { params: { consent } }),
};

export const files = {
  upload: (sessionId, file) => {
    const form = new FormData();
    form.append('file', file);
    return client.post(`/files/session/${sessionId}/upload`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  list: (sessionId) => client.get(`/files/session/${sessionId}/list`),
  view: (sessionId, fileId) => `/api/files/session/${sessionId}/file/${fileId}`,
};
