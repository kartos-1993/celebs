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
 * Extracts a user-friendly error message from any error object
 */
export function getErrorMessage(
  error: unknown,
  fallback = 'An unexpected error occurred',
): string {
  if (!error) return fallback;
  if (typeof error === 'string') return error;

  const err = error as AppApiError;
  return err.response?.data?.message || err.message || fallback;
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
