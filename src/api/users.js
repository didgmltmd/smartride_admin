import client from "./client";
import { ENDPOINTS } from "../config/endpoints";

export async function getUsers() {
  const { data } = await client.get(ENDPOINTS.users);
  return data;
}

export async function getRetiredUsers() {
  const { data } = await client.get(`${ENDPOINTS.users}/retired`);
  return data;
}

export async function findUser(employeeId) {
  const { data } = await client.get(`${ENDPOINTS.users}/${employeeId}`);
  return data;
}

export async function createUser(payload) {
  const { data } = await client.post(ENDPOINTS.users, payload);
  return data;
}

export async function deleteUser(employeeId) {
  const { data } = await client.delete(`${ENDPOINTS.users}/${employeeId}`);
  return data;
}

export async function updateUserPassword(employeeId, password) {
  const { data } = await client.put(`${ENDPOINTS.users}/${employeeId}/password`, { password });
  return data;
}

export async function restoreUser(employeeId) {
  const { data } = await client.put(`${ENDPOINTS.users}/${employeeId}/restore`);
  return data;
}
