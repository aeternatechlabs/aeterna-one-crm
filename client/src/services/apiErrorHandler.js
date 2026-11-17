import toast from 'react-hot-toast';
import api from './api';
import { getFriendlyErrorMessage } from './errorMessages';

/**
 * Centralized API execution wrapper
 * @param {string} method - 'get' | 'post' | 'put' | 'patch' | 'delete'
 * @param {string} url - API endpoint
 * @param {any} [data] - Request payload or query params
 * @param {Object} [options] - Configuration flags
 * @param {boolean} [options.showToast=true] - Display toast on error
 * @param {string} [options.fallbackMsg] - Custom fallback message
 */
export async function handleApiCall(method, url, data = null, options = {}) {
  const { showToast = true, fallbackMsg, ...axiosConfig } = options;
  const lowerMethod = method.toLowerCase();

  try {
    let response;
    if (['post', 'put', 'patch'].includes(lowerMethod)) {
      response = await api[lowerMethod](url, data, axiosConfig);
    } else {
      const config = data ? { ...axiosConfig, params: data } : axiosConfig;
      response = await api[lowerMethod](url, config);
    }
    return response.data;
  } catch (error) {
    const message = getFriendlyErrorMessage(error, fallbackMsg);
    if (showToast) {
      toast.error(message);
    }
    error.friendlyMessage = message;
    throw error;
  }
}
