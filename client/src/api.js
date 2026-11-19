export class ApiError extends Error {
  constructor(message, status) {
    super(message)
    this.status = status
  }
}

async function request(path, { method = 'GET', body, form } = {}) {
  let res
  try {
    res = await fetch(path, {
      method,
      credentials: 'same-origin',
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: form ?? (body ? JSON.stringify(body) : undefined),
    })
  } catch {
    throw new ApiError('Could not reach the server. Check your connection.', 0)
  }

  const json = res.status === 204 ? null : await res.json().catch(() => null)
  if (!res.ok) {
    // An expired/revoked session on any call other than the login form itself sends the user back to login.
    if (res.status === 401 && !path.startsWith('/api/auth/login')) window.dispatchEvent(new Event('ff:unauthorized'))
    throw new ApiError(json?.error ?? `Request failed (${res.status}).`, res.status)
  }
  return json
}

export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: 'POST', body }),
  put: (path, body) => request(path, { method: 'PUT', body }),
  patch: (path, body) => request(path, { method: 'PATCH', body }),
  del: (path) => request(path, { method: 'DELETE' }),
  upload: (path, form) => request(path, { method: 'POST', form }),
}
