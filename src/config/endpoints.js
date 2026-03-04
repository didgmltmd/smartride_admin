export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

export const ENDPOINTS = {
  login: "/auth/login",
  users: "/admin/users",
  messages: "/admin/messages",
  settlementUpload: "/admin/excel/settlements",
};
