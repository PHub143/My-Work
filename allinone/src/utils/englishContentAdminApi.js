import { API_URL } from '../config.js';

async function requestJson(path, { token, method = 'GET', body, fetchImpl = fetch } = {}) {
  const response = await fetchImpl(`${API_URL}${path}`, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const error = new Error(data?.message || 'Content admin request failed.');
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

export function listContentSnapshots({ token, status = '', fetchImpl } = {}) {
  const params = new URLSearchParams({ includePayload: 'false' });
  if (status) params.set('status', status);
  return requestJson(`/learning/content/snapshots?${params}`, { token, fetchImpl });
}

export function getContentSnapshot({ token, id, fetchImpl } = {}) {
  return requestJson(`/learning/content/snapshots/${id}`, { token, fetchImpl });
}

export function createContentDraft({ token, baseSnapshotId, fetchImpl } = {}) {
  return requestJson('/learning/content/drafts', {
    token,
    method: 'POST',
    body: { kind: 'english', ...(baseSnapshotId ? { baseSnapshotId } : {}) },
    fetchImpl,
  });
}

export function updateContentDraft({ token, id, payload, fetchImpl } = {}) {
  return requestJson(`/learning/content/drafts/${id}`, {
    token,
    method: 'PATCH',
    body: { payload },
    fetchImpl,
  });
}

export function validateContentDraft({ token, id, fetchImpl } = {}) {
  return requestJson(`/learning/content/drafts/${id}/validate`, {
    token,
    method: 'POST',
    fetchImpl,
  });
}

export function publishContentDraft({ token, id, fetchImpl } = {}) {
  return requestJson(`/learning/content/drafts/${id}/publish`, {
    token,
    method: 'POST',
    fetchImpl,
  });
}

export async function exportContentSnapshot({ token, id, fetchImpl = fetch } = {}) {
  const response = await fetchImpl(`${API_URL}/learning/content/snapshots/${id}/export`, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!response.ok) {
    throw new Error('Snapshot export failed.');
  }

  return response.text();
}
