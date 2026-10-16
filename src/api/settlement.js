import client from "./client";
import { ENDPOINTS } from "../config/endpoints";

export async function uploadSettlement(file) {
  const formData = new FormData();
  formData.append("file", file);

  const { data } = await client.post(ENDPOINTS.settlementUpload, formData, {
    timeout: 100000,
  });

  return data;
}
