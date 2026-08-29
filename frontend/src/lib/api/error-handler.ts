import axios, { AxiosError } from 'axios';
import { APIError } from '@/types/api';

export type ErrorContext =
  | 'login'
  | 'register'
  | 'verify-email'
  | 'resend-otp'
  | 'verify-phone'
  | 'confirm-phone'
  | 'password-reset-request'
  | 'password-reset-confirm'
  | 'checkout'
  | 'cart'
  | 'product'
  | 'address'
  | 'generic';

export interface ParsedApiError {
  status: number;
  code: string;
  message: string;
  details?: Record<string, string[]> | null;
  retryAfterSeconds?: number | null;
  requestId?: string;
  isThrottled: boolean;
  isAuthError: boolean;
}

/**
 * Extracts retry seconds from headers or error message strings.
 * Examples: "Request was throttled. Expected available in 42 seconds." -> 42
 */
export function extractRetryAfterSeconds(error: AxiosError): number | null {
  // 1. Try reading Retry-After response header
  const retryHeader = error.response?.headers?.['retry-after'];
  if (retryHeader) {
    const parsed = parseInt(String(retryHeader), 10);
    if (!isNaN(parsed) && parsed > 0) {
      return parsed;
    }
  }

  // 2. Try regex extracting from message in body
  const data = error.response?.data as any;
  const rawMsg = data?.error?.message || data?.detail || data?.message || '';
  if (typeof rawMsg === 'string') {
    const match = rawMsg.match(/available in (\d+)\s*(?:seconds|second|s)/i);
    if (match && match[1]) {
      const parsed = parseInt(match[1], 10);
      if (!isNaN(parsed) && parsed > 0) {
        return parsed;
      }
    }
  }

  return null;
}

/**
 * Parses any error into a clean, context-aware ParsedApiError structure.
 */
export function parseApiError(error: unknown, context: ErrorContext = 'generic'): ParsedApiError {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status || 0;
    const data = error.response?.data as any;
    const requestId =
      data?.request_id ||
      data?.error?.request_id ||
      (error.response?.headers?.['x-request-id'] as string) ||
      undefined;

    const isThrottled = status === 429;
    const isAuthError = status === 401;
    const retryAfter = isThrottled ? extractRetryAfterSeconds(error) : null;

    let code = 'HTTP_ERROR';
    let rawMessage = '';
    let details: Record<string, string[]> | null = null;

    // Check standardized Paradox Shop error envelope or direct DRF validation error map
    if (data && typeof data === 'object') {
      if (Array.isArray(data)) {
        rawMessage = data.map(String).join(', ');
      } else if (data.error && typeof data.error === 'object') {
        code = data.error.code || `HTTP_${status}`;
        rawMessage = data.error.message || '';
        if (data.error.details && typeof data.error.details === 'object') {
          details = data.error.details;
        }
      } else {
        code = data.code || `HTTP_${status}`;
        rawMessage = data.detail || data.message || '';
        if (data.errors && typeof data.errors === 'object') {
          details = data.errors;
        } else {
          // Extract direct field validation errors from DRF: { [field]: ["error"] }
          const fieldKeys = Object.keys(data).filter(
            (k) => !['code', 'status', 'detail', 'message', 'request_id'].includes(k)
          );
          if (fieldKeys.length > 0) {
            const extractedDetails: Record<string, string[]> = {};
            const extractedMsgs: string[] = [];
            for (const key of fieldKeys) {
              const val = data[key];
              const msgList = Array.isArray(val)
                ? val.map(String)
                : typeof val === 'object' && val !== null
                ? [JSON.stringify(val)]
                : [String(val)];
              extractedDetails[key] = msgList;
              const formattedField = key === 'non_field_errors' ? '' : `${key}: `;
              extractedMsgs.push(`${formattedField}${msgList.join(', ')}`);
            }
            details = extractedDetails;
            if (!rawMessage && extractedMsgs.length > 0) {
              rawMessage = extractedMsgs.join(' | ');
            }
          }
        }
      }
    }

    // Contextual and status-based user-friendly message generation
    let userMessage = rawMessage;

    if (isThrottled) {
      if (retryAfter && retryAfter > 0) {
        userMessage =
          context === 'login'
            ? `Too many login attempts. Please try again in ${retryAfter} seconds.`
            : context === 'register'
            ? `Too many registration attempts. Please try again in ${retryAfter} seconds.`
            : `Too many requests. Please slow down and try again in ${retryAfter} seconds.`;
      } else {
        userMessage =
          context === 'login'
            ? 'Too many login attempts. Please wait a moment before trying again.'
            : 'Too many requests. Please slow down and wait a moment.';
      }
    } else if (isAuthError) {
      if (rawMessage && !rawMessage.toLowerCase().includes('given token not valid')) {
        userMessage = rawMessage;
      } else if (context === 'login') {
        userMessage = 'Invalid email or password. Please verify your credentials.';
      } else if (context === 'checkout') {
        userMessage = 'Your session has expired. Please sign in to proceed with checkout.';
      } else {
        userMessage = 'Authentication required. Please sign in to continue.';
      }
    } else if (status === 403) {
      userMessage = rawMessage || 'You do not have permission to perform this action.';
    } else if (status === 404) {
      userMessage = rawMessage || 'The requested resource was not found.';
    } else if (status === 400) {
      if (details) {
        const parts = Object.entries(details).map(([key, val]) => {
          const text = Array.isArray(val) ? val.join(', ') : String(val);
          return key !== 'non_field_errors' ? `${key}: ${text}` : text;
        });
        if (parts.length > 0) {
          userMessage = parts.join(' | ');
        }
      }
      if (!userMessage) {
        userMessage = 'Invalid request parameters. Please verify your input.';
      }
    } else if (status >= 500) {
      userMessage = 'A server error occurred. Our engineering team has been alerted.';
    } else if (!status || error.code === 'ERR_NETWORK' || error.message.includes('Network Error')) {
      userMessage = 'Network connection unreachable. Please check your internet connection.';
    } else if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      userMessage = 'Request timed out. Please try again.';
    }

    if (!userMessage) {
      userMessage = 'An unexpected error occurred.';
    }

    return {
      status,
      code,
      message: userMessage,
      details,
      retryAfterSeconds: retryAfter,
      requestId,
      isThrottled,
      isAuthError,
    };
  }

  if (error instanceof Error) {
    return {
      status: 0,
      code: 'CLIENT_ERROR',
      message: error.message || 'An unexpected client error occurred.',
      isThrottled: false,
      isAuthError: false,
    };
  }

  return {
    status: 0,
    code: 'UNKNOWN_ERROR',
    message: 'An unexpected error occurred.',
    isThrottled: false,
    isAuthError: false,
  };
}

/**
 * Converts a ParsedApiError back into legacy APIError format for backwards compatibility
 */
export function toApiError(parsed: ParsedApiError): APIError {
  return {
    code: parsed.code,
    detail: parsed.message,
    errors: parsed.details || undefined,
    request_id: parsed.requestId,
  };
}
