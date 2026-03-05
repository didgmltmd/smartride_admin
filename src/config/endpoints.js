export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

export const ENDPOINTS = {
  login: "/auth/login",
  users: "/admin/users",
  messages: "/admin/messages",
  messageImageUpload: "/admin/uploads/images",
  settlementUpload: "/admin/excel/settlements",
};
