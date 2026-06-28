import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { ChevronUp, ChevronDown } from 'lucide-react';

const numberInputVariants = cva(
  'relative flex w-full items-center rounded-md border border-input bg-background text-foreground shadow-sm transition-colors focus-within:ring-1 focus-within:ring-ring disabled:opacity-50 disabled:cursor-not-allowed',
  {
    variants: {
      size: {
        sm: 'h-8 text-sm',
        md: 'h-9 text-base md:text-sm',
        lg: 'h-10 text-base',
      },
      variant: {
        default: '',
        subtle: 'bg-muted/40',
        ghost: 'bg-transparent',
      },
      invalid: {
        true: 'border-destructive focus-within:ring-destructive',
        false: '',
      },
    },
    defaultVariants: {
      size: 'md',
      variant: 'default',
      invalid: false,
    },
  },
);

export type NumberInputProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  'size'
> &
  VariantProps<typeof numberInputVariants> & {
    prefix?: React.ReactNode;
    suffix?: React.ReactNode;
  };

export const NumberInput = React.forwardRef<HTMLInputElement, NumberInputProps>(
  (
    {
      className,
      size,
      variant,
      invalid,
      prefix,
      suffix,
      step,
      min,
      max,
      onChange,
      ...props
    },
    ref,
  ) => {
    const innerRef = React.useRef<HTMLInputElement | null>(null);
    React.useImperativeHandle(ref, () => innerRef.current as HTMLInputElement);

    const dispatchInput = React.useCallback(() => {
      const el = innerRef.current;
      if (!el) return;
      const ev = new Event('input', { bubbles: true });
      el.dispatchEvent(ev);
    }, []);

    const inc = () => {
      const el = innerRef.current;
      if (!el) return;
      try {
        el.stepUp();
      } catch {}
      dispatchInput();
    };
    const dec = () => {
      const el = innerRef.current;
      if (!el) return;
      try {
        el.stepDown();
      } catch {}
      dispatchInput();
    };

    return (
      <div className={cn('number-input', numberInputVariants({ size, variant, invalid }), className)}>
        {prefix ? (
          <div className="pl-3 pr-1 text-muted-foreground select-none">{prefix}</div>
        ) : null}
        <input
          ref={innerRef}
          type="number"
          step={step}
          min={min}
          max={max}
          onChange={onChange}
          className={cn(
            'w-full bg-transparent px-3 py-1 pr-8 placeholder:text-muted-foreground focus:outline-none',
            prefix ? 'pl-1' : '',
            size === 'sm' ? 'h-8' : size === 'lg' ? 'h-10' : 'h-9',
          )}
          {...props}
        />
        {suffix ? (
          <div className="px-2 text-muted-foreground select-none">{suffix}</div>
        ) : null}
        <div className="absolute right-1 top-1/2 -translate-y-1/2 flex flex-col items-center">
          <button
            type="button"
            aria-label="Increase"
            className="flex h-4 w-4 items-center justify-center rounded hover:bg-accent hover:text-accent-foreground text-muted-foreground"
            onClick={inc}
            tabIndex={-1}
          >
            <ChevronUp className="h-3 w-3" />
          </button>
          <button
            type="button"
            aria-label="Decrease"
            className="mt-0.5 flex h-4 w-4 items-center justify-center rounded hover:bg-accent hover:text-accent-foreground text-muted-foreground"
            onClick={dec}
            tabIndex={-1}
          >
            <ChevronDown className="h-3 w-3" />
          </button>
        </div>
      </div>
    );
  },
);
NumberInput.displayName = 'NumberInput';

export default NumberInput;
