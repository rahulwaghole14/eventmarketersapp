/**
 * Centralized error handler utility for React Native mobile application
 * Converts raw backend error messages into user-friendly messages
 */

export const getUserFriendlyError = (error: any): string => {
  // Check for network errors first (no response from server)
  if (!error.response) {
    return "Some technical issue, please try again.";
  }

  const backendMessage =
    error?.response?.data?.error ||
    error?.response?.data?.message ||
    error?.message ||
    '';

  const status = error?.response?.status;

  // Handle specific HTTP status codes
  switch (status) {
    case 400:
      // Bad Request - often validation errors
      if (backendMessage && typeof backendMessage === 'string') {
        const lowerMsg = backendMessage.toLowerCase();
        if (lowerMsg.includes("already verified") || lowerMsg.includes("already registered")) {
          return "This phone number is already verified. Please sign in instead.";
        }
        if (lowerMsg.includes("invalid") || lowerMsg.includes("otp") || lowerMsg.includes("code") || lowerMsg.includes("incorrect") || lowerMsg.includes("wrong")) {
          return "Invalid OTP. Please try again";
        }
        if (lowerMsg.includes("expired")) {
          return "This code has expired. Please request a new one.";
        }
      }
      return "Invalid OTP. Please try again";
    case 401:
      // Unauthorized - check for invalid OTP or credentials
      if (backendMessage && typeof backendMessage === 'string') {
        const lowerMsg = backendMessage.toLowerCase();
        if (lowerMsg.includes("otp") || lowerMsg.includes("code") || lowerMsg.includes("verification")) {
          return "Invalid OTP. Please try again";
        }
      }
      return "Invalid email or password.";
    case 403:
      // Forbidden - check for specific download limit message
      if (backendMessage === "Daily download limit reached") {
        return "You have reached your daily download limit. Please try again tomorrow.";
      }
      // Other 403 errors
      return "You are not authorized to perform this action.";
    case 404:
      // Not Found
      return "Registration required";
    case 429:
      // Too Many Requests - rate limiting
      return "Too many attempts. Please wait and try again.";
    case 500:
    case 502:
    case 503:
    case 504:
      // Server errors
      return "Server error. Please try again later.";
  }

  // Handle common backend message patterns
  const lowerMessage = backendMessage.toLowerCase();

  if (lowerMessage.includes("invalid") || lowerMessage.includes("otp") || lowerMessage.includes("code")) {
    return "Invalid OTP. Please try again";
  }

  if (lowerMessage.includes("expired")) {
    return "This code has expired. Please request a new one.";
  }

  if (lowerMessage.includes("not found")) {
    return "We couldn't find an account with this information.";
  }

  if (lowerMessage.includes("network") || lowerMessage.includes("timeout")) {
    return "Some technical issue, please try again.";
  }

  if (lowerMessage.includes("rate limit") || lowerMessage.includes("too many")) {
    return "Too many attempts. Please wait and try again.";
  }

  // Default fallback for any other errors
  return "Something went wrong. Please try again.";
};

/**
 * Check if error is specifically for daily download limit
 */
export const isDailyDownloadLimitError = (error: any): boolean => {
  return error?.response?.status === 403 && 
         error?.response?.data?.message === "Daily download limit reached";
};
