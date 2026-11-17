import toast from 'react-hot-toast';

/**
 * Optimistic action with loading toast flow:
 * 1. Shows a loading toast
 * 2. Applies optimistic state change immediately
 * 3. Executes API call in the background
 * 4. On success: replaces loading toast with success toast
 * 5. On failure: reverts state change and replaces loading toast with error toast
 *
 * @param {Object} opts
 * @param {string} opts.loadingMsg - Toast message shown during API call
 * @param {string} opts.successMsg - Toast message shown on success
 * @param {string} [opts.errorMsg] - Fallback message shown on failure
 * @param {Function} [opts.applyOptimistic] - Synchronous function that updates UI immediately
 * @param {Function} [opts.revert] - Function that restores previous UI state on error
 * @param {Function} opts.apiCall - Async function that performs the network request
 * @param {Function} [opts.onSuccess] - Callback executed on success
 * @param {Function} [opts.onError] - Callback executed on failure
 * @param {Function} [opts.onFinally] - Callback executed after completion
 */
export async function optimisticAction({
  loadingMsg = 'Updating status...',
  successMsg = 'Updated successfully',
  errorMsg = 'Action failed. Rolling back changes.',
  applyOptimistic,
  revert,
  apiCall,
  onSuccess,
  onError,
  onFinally,
}) {
  const toastId = toast.loading(loadingMsg);

  if (applyOptimistic && typeof applyOptimistic === 'function') {
    try {
      applyOptimistic();
    } catch (err) {
      console.error('[Optimistic] applyOptimistic error:', err);
    }
  }

  try {
    const result = await apiCall();
    toast.success(successMsg, { id: toastId });
    if (onSuccess) onSuccess(result);
    return result;
  } catch (err) {
    if (revert && typeof revert === 'function') {
      try {
        revert();
      } catch (revErr) {
        console.error('[Optimistic] revert error:', revErr);
      }
    }
    const msg =
      err?.response?.data?.message ||
      err?.friendlyMessage ||
      err?.message ||
      errorMsg;

    toast.error(msg, { id: toastId });
    if (onError) onError(err);
    throw err;
  } finally {
    if (onFinally) onFinally();
  }
}

/**
 * Higher-order helper: wraps optimisticAction with automatic state capture and restore.
 * Captures previous state from getState() before applyOptimistic, and restores via setState() on failure.
 *
 * @param {Object} opts
 * @param {Function} opts.getState - Returns current state snapshot
 * @param {Function} opts.setState - Updates state with new or previous value
 * @param {Function} opts.applyOptimistic - (currentState) => nextState
 * @param {Function} [opts.revert] - Optional custom revert logic; defaults to setState(prevState)
 * @param {Function} opts.apiCall - Async API request function
 */
export async function optimisticWithRevert({
  getState,
  setState,
  applyOptimistic,
  revert,
  apiCall,
  loadingMsg,
  successMsg,
  errorMsg,
  onSuccess,
  onError,
  onFinally,
}) {
  const prevState = getState ? getState() : null;

  return optimisticAction({
    loadingMsg,
    successMsg,
    errorMsg,
    applyOptimistic: () => {
      if (applyOptimistic) {
        const nextState = applyOptimistic(prevState);
        if (nextState !== undefined && setState) {
          setState(nextState);
        }
      }
    },
    revert: () => {
      if (revert && typeof revert === 'function') {
        revert(prevState);
      } else if (setState && prevState !== null) {
        setState(prevState);
      }
    },
    apiCall,
    onSuccess,
    onError,
    onFinally,
  });
}
