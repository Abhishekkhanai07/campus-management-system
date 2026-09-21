import axios from 'axios';
export const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || '/api',
});
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('campus_token');
    if (token)
        config.headers.Authorization = `Bearer ${token}`;
    return config;
});
api.interceptors.response.use((res) => res, (err) => {
    if (err.response?.status === 401 && !location.pathname.startsWith('/login')) {
        localStorage.removeItem('campus_token');
        localStorage.removeItem('campus_user');
        location.href = '/login';
    }
    return Promise.reject(err);
});
/** Pulls the readable message out of a Nest error response. */
export function errorText(err) {
    const m = err?.response?.data?.message;
    if (Array.isArray(m))
        return m.join(', ');
    return m || err?.message || 'Something went wrong';
}
export const get = (url, params) => api.get(url, { params }).then((r) => r.data);
export const post = (url, body) => api.post(url, body).then((r) => r.data);
export const patch = (url, body) => api.patch(url, body).then((r) => r.data);
export const del = (url) => api.delete(url).then((r) => r.data);
