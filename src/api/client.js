import axios from 'axios';
import { API_BASE_URL } from '../config/endpoints';
import { clearSession, readSession } from '../lib/session';
const client = axios.create({ baseURL: API_BASE_URL, timeout: 30000 });
client.interceptors.request.use((config) => {
  const token = readSession()?.token;
  if (token && config.url !== '/auth/login') config.headers.Authorization = `Bearer ${token}`;
  return config;
});
client.interceptors.response.use((response) => {
  if (response.data?.success === false) return Promise.reject(new Error(response.data.message || '요청을 처리하지 못했습니다.'));
  return response;
}, (error) => {
  if (error?.response?.status === 401 && error.config?.url !== '/auth/login') {
    clearSession();
    window.dispatchEvent(new Event('smartride:session-expired'));
  }
  return Promise.reject(error);
});
export default client;
