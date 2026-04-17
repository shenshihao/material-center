import axios from 'axios';

const client = axios.create({
  baseURL: '/api/v1',
  timeout: 60000,
});

client.interceptors.response.use(
  (res) => res.data,
  (err) => {
    const msg = err.response?.data?.error?.message || err.message || '请求失败';
    return Promise.reject(new Error(msg));
  }
);

export default client;
