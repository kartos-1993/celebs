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
export function sanitizeErrorMessage(rawMessage: string, fallback = 'An unexpected error occurred'): string {
  if (!rawMessage) return fallback;

  // Duplicate key (E11000) MongoDB error handling
  if (rawMessage.includes('E11000') || rawMessage.includes('duplicate key') || rawMessage.includes('dup key:')) {
    return 'A category with this name already exists';
  }

  // Handle ObjectId cast errors
  if (rawMessage.includes('Cast to ObjectId') || rawMessage.includes('Invalid ObjectId')) {
    return 'Invalid ID format';
  }

  // Strip generic technical prefixes if present
  let cleanMessage = rawMessage;
  if (cleanMessage.startsWith('Failed to create category: ')) {
    cleanMessage = cleanMessage.replace('Failed to create category: ', '');
  } else if (cleanMessage.startsWith('Failed to update category: ')) {
    cleanMessage = cleanMessage.replace('Failed to update category: ', '');
  }

  // Re-check after prefix stripping
  if (cleanMessage.includes('E11000') || cleanMessage.includes('collection:') || cleanMessage.includes('dup key:')) {
    return 'A category with this name already exists';
  }

  return cleanMessage;
}

/**
 * Extracts a user-friendly error message from any error object
 */
export function getErrorMessage(
  error: unknown,
  fallback = 'An unexpected error occurred',
): string {
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
