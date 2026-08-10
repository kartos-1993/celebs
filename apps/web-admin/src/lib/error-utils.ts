import { toast } from '@/hooks/use-toast';

export interface AppApiError {
  status?: number;
  message?: string;
  errorCode?: string;
  response?: {
    data?: {
      message?: string;
      errorCode?: string;
    };
  };
}

/**
 * Sanitizes technical database/server error strings into human-readable messages for non-technical users.
 */
export function sanitizeErrorMessage(
  rawMessage: string,
  fallback = 'An unexpected error occurred',
): string {
  if (!rawMessage) return fallback;

  if (
    rawMessage.includes('unique constraint') ||
    rawMessage.includes('duplicate key')
  ) {
    return 'A record with this unique value already exists';
  }

  // Strip generic technical prefixes if present
  let cleanMessage = rawMessage;
  if (cleanMessage.startsWith('Failed to create category: ')) {
    cleanMessage = cleanMessage.replace('Failed to create category: ', '');
  } else if (cleanMessage.startsWith('Failed to update category: ')) {
    cleanMessage = cleanMessage.replace('Failed to update category: ', '');
  }

  return cleanMessage;
}

/**
 * Extracts a user-friendly error message from any error object
 */
export function getErrorMessage(error: unknown, fallback = 'An unexpected error occurred'): string {
  if (!error) return fallback;

  let rawMessage = fallback;
  if (typeof error === 'string') {
    rawMessage = error;
  } else {
    const err = error as AppApiError;
    rawMessage = err.response?.data?.message || err.message || fallback;
  }

  return sanitizeErrorMessage(rawMessage, fallback);
}

/**
 * Displays a global destructive toast message for errors
 */
export function showErrorToast(error: unknown, fallbackMessage?: string) {
  const message = getErrorMessage(error, fallbackMessage);
  toast({
    variant: 'destructive',
    title: 'Error',
    description: message,
  });
}
