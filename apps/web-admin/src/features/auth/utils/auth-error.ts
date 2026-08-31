import { UseFormSetError } from 'react-hook-form';

import { SignInFormValues } from '../types/sign-in.schema';

interface ApiErrorResponse {
  message?: string;
  errorCode?: string;
  errors?: Array<{ field?: keyof SignInFormValues; message?: string }>;
}

export function handleSignInErrors(
  error: unknown,
  setError: UseFormSetError<SignInFormValues>,
  setServerError: (msg: string) => void,
) {
  const axiosResponse = (error as { response?: { data?: ApiErrorResponse } })?.response?.data;
  const directObj = error as ApiErrorResponse;

  const errors = axiosResponse?.errors || directObj?.errors;
  const message = axiosResponse?.message || directObj?.message;

  if (errors && Array.isArray(errors) && errors.length > 0) {
    errors.forEach((err) => {
      if (err.field) {
        setError(err.field, { type: 'server', message: err.message });
      }
    });
  } else if (message) {
    setServerError(message);
  } else {
    setServerError('Invalid email or password');
  }
}
