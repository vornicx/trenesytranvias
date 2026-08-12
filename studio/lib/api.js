export function createApiFetch({
  config,
  getAccessToken,
  refreshSession,
  fetchImpl = fetch
}) {
  return async function apiFetch(path, options = {}, retry = true) {
    const accessToken = getAccessToken();
    if (!accessToken) throw new Error('not_authenticated');

    const response = await fetchImpl(`${config.url}/rest/v1/${path}`, {
      ...options,
      headers: {
        apikey: config.publishableKey,
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    });
    if (response.status === 401 && retry) {
      await refreshSession();
      return apiFetch(path, options, false);
    }
    if (!response.ok) {
      const details = await response.text().catch(() => '');
      throw Object.assign(new Error(details || `HTTP ${response.status}`), { status: response.status });
    }
    if (response.status === 204) return null;
    return response.json().catch(() => null);
  };
}
