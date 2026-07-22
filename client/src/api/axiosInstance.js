import axios from 'axios';

const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5002/api/v1',
  withCredentials: true // send cookies along
});

// Request Interceptor
axiosInstance.interceptors.request.use(
  (config) => {
    const token = sessionStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((promise) => {
    if (error) {
      promise.reject(error);
    } else {
      promise.resolve(token);
    }
  });
  failedQueue = [];
};

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Handle 401 Unauthorized and retry original request with new token
    if (error.response && error.response.status === 401 && !originalRequest._retry) {
      
      // If refresh token request itself fails or it's a login request, reject directly
      if (originalRequest.url.includes('/auth/refresh') || originalRequest.url.includes('/auth/login')) {
        return Promise.reject(error);
      }

      originalRequest._retry = true;

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return axiosInstance(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      isRefreshing = true;

      try {
        const response = await axiosInstance.post('/auth/refresh');
        const { token } = response.data.data;
        
        sessionStorage.setItem('token', token);
        
        processQueue(null, token);
        isRefreshing = false;

        originalRequest.headers.Authorization = `Bearer ${token}`;
        return axiosInstance(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        isRefreshing = false;
        
        // Session expired - clear state and redirect
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('user');
        
        // Prevent redirect loop if already on login
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login?expired=true';
        }
        
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
