export const base = (import.meta.env?.BASE_URL || '/status-compass/').replace(/\/?$/, '/');
export const href = (path = '') => `${base}${String(path).replace(/^\//, '')}`;
