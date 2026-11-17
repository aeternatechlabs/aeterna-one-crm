/**
 * Translates HTTP status codes and backend error messages into friendly user notices
 */
export function getFriendlyErrorMessage(error, fallback = 'An unexpected error occurred. Please try again.') {
  if (!error) return fallback;

  // Direct backend response message
  const backendMessage = error.response?.data?.message;

  // Status code based fallback
  const status = error.response?.status;

  if (backendMessage) {
    // If validation error array exists, append details
    const validationErrors = error.response?.data?.errors;
    if (Array.isArray(validationErrors) && validationErrors.length > 0) {
      const details = validationErrors.map((e) => e.message || e.msg || e).join(', ');
      return `${backendMessage}: ${details}`;
    }
    return backendMessage;
  }

  switch (status) {
    case 400:
      return 'The submitted information was incomplete or invalid.';
    case 401:
      return 'Authentication required. Please sign in to your Aeterna CRM account.';
    case 403:
      return 'Access denied. Your account does not have permission for this branch or action.';
    case 404:
      return 'The requested record or resource was not found.';
    case 409:
      return 'A conflict occurred. This record or email already exists.';
    case 429:
      return 'Too many requests. Please wait a moment and try again.';
    case 500:
    case 502:
    case 503:
      return 'Server error. Our technical team has been notified. Please try again shortly.';
    default:
      return error.message || fallback;
  }
}
