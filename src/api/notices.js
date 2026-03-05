import client from "./client";
import { ENDPOINTS } from "../config/endpoints";

export async function getMessages() {
  const { data } = await client.get(ENDPOINTS.messages);
  return data;
}

export async function createMessage(payload) {
  const { data } = await client.post(ENDPOINTS.messages, payload);
  return data;
}

export async function uploadMessageImages(files) {
  const formData = new FormData();
  files.forEach((file) => formData.append("files", file));

  const { data } = await client.post(ENDPOINTS.messageImageUpload, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return data;
}

export async function updateMessage(id, payload) {
  const { data } = await client.put(`${ENDPOINTS.messages}/${id}`, payload);
  return data;
}

export async function deleteMessage(id) {
  const { data } = await client.delete(`${ENDPOINTS.messages}/${id}`);
  return data;
}

export async function getMessageReads(id) {
  const { data } = await client.get(`${ENDPOINTS.messages}/${id}/reads`);
  return data;
}
