import client from "./client";
import { ENDPOINTS } from "../config/endpoints";

export async function getUsers(signal) {
  const { data } = await client.get(ENDPOINTS.users, { signal });
  return data;
}

export async function getRetiredUsers() {
  const { data } = await client.get(`${ENDPOINTS.users}/retired`);
  return data;
}

export async function findUser(employeeId) {
  const { data } = await client.get(`${ENDPOINTS.users}/${encodeURIComponent(employeeId)}`);
  return data;
}

export async function createUser(payload) {
  const { data } = await client.post(ENDPOINTS.users, payload);
  return data;
}

export async function deleteUser(employeeId) {
  const { data } = await client.delete(`${ENDPOINTS.users}/${encodeURIComponent(employeeId)}`);
  return data;
}

export async function updateUserPassword(employeeId, password) {
  const { data } = await client.put(`${ENDPOINTS.users}/${encodeURIComponent(employeeId)}/password`, { password });
  return data;
}

export async function restoreUser(employeeId) {
  const { data } = await client.put(`${ENDPOINTS.users}/${encodeURIComponent(employeeId)}/restore`);
  return data;
}
