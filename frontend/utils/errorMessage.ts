type ErrorWithResponse = {
  message?: string;
  response?: {
    data?: {
      message?: string;
      error?: string;
    } | string;
  };
};

export const getErrorMessage = (error: unknown, fallback = 'Something went wrong.') => {
  const safeError = error as ErrorWithResponse;

  const responseData = safeError?.response?.data;
  if (typeof responseData === 'string' && responseData.trim().length > 0) {
    return responseData;
  }

  if (
    responseData &&
    typeof responseData === 'object' &&
    'message' in responseData &&
    typeof responseData.message === 'string' &&
    responseData.message.trim().length > 0
  ) {
    return responseData.message;
  }

  if (
    responseData &&
    typeof responseData === 'object' &&
    'error' in responseData &&
    typeof responseData.error === 'string' &&
    responseData.error.trim().length > 0
  ) {
    return responseData.error;
  }

  if (typeof safeError?.message === 'string' && safeError.message.trim().length > 0) {
    return safeError.message;
  }

  return fallback;
};
