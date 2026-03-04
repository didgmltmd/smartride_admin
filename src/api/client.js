import axios from "axios";
import { API_BASE_URL } from "../config/endpoints";

const client = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

client.interceptors.request.use((config) => {
  const token = localStorage.getItem("accessToken");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("employeeId");
      localStorage.removeItem("name");
      window.location.replace("/login");
    }
    return Promise.reject(error);
  }
);

export default client;
