import client from "./client";
import { ENDPOINTS } from "../config/endpoints";

export async function loginApi(payload) {
  const { data } = await client.post(ENDPOINTS.login, payload);
  return data;
}
