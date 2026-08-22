import * as React from 'react';
import { Loader2 } from 'lucide-react';

import { cn } from '@/lib/utils';

const spinnerSizes = {
  sm: 'h-3.5 w-3.5',
  default: 'h-4 w-4',
  lg: 'h-6 w-6',
  xl: 'h-8 w-8',
} as const;

export interface SpinnerProps extends React.ComponentPropsWithoutRef<typeof Loader2> {
  size?: keyof typeof spinnerSizes;
}

const Spinner = React.forwardRef<React.ElementRef<typeof Loader2>, SpinnerProps>(
  ({ className, size = 'default', ...props }, ref) => (
    <Loader2
      ref={ref}
      role="status"
      aria-label="Loading"
      className={cn('animate-spin', spinnerSizes[size], className)}
      {...props}
    />
  ),
);
Spinner.displayName = 'Spinner';

export { Spinner };
