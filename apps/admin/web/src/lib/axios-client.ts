import axios from "axios";

// Fallback URL for cases where env var might not load
const FALLBACK_API_URL = "http://localhost:8000/api/v1/";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || FALLBACK_API_URL;

console.log("[Axios Config] Using API Base URL:", API_BASE_URL);

const options = {
  baseURL: API_BASE_URL,
  withCredentials: true,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
};

const API = axios.create(options);

// Refresh client
export const APIRefresh = axios.create(options);
APIRefresh.interceptors.response.use((response) => response);

// Main API interceptor
API.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (!error.response) {
      console.error("Network Error:", error.message);
      return Promise.reject({ message: "Network Error" });
    }

    const { status, data } = error.response;

    if (status === 401 && data === "Unauthorized") {
      try {
        await APIRefresh.get("/auth/refresh");
        return API(error.config); // Retry original request
      } catch (refreshError) {
        console.error("Refresh token failed:", refreshError);
        window.location.href = "/login";
        return Promise.reject({ message: "Session expired" });
      }
    }

    // Handle other errors
    return Promise.reject({
      status: error.response?.status,
      message: data?.message || error.message,
      ...data,
    });
  }
);

export default API;
