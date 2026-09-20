import React, { forwardRef } from 'react';
import { cn } from '@/lib/utils/cn';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, helperText, leftIcon, rightIcon, id, disabled, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full flex flex-col gap-1.5 text-start">
        {label && (
          <label htmlFor={inputId} className="text-xs font-medium text-fg-secondary">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {leftIcon && (
            <div className="absolute start-3 flex items-center pointer-events-none text-fg-muted">
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            disabled={disabled}
            className={cn(
              'w-full h-10 px-3 text-sm bg-bg-elevated text-fg-primary placeholder:text-fg-muted border border-border-subtle rounded-md transition-colors duration-150 focus-ring',
              'hover:border-border-accent focus:border-accent disabled:opacity-50 disabled:cursor-not-allowed',
              leftIcon && 'ps-9',
              rightIcon && 'pe-9',
              error && 'border-status-error focus:border-status-error',
              className
            )}
            {...props}
          />
          {rightIcon && (
            <div className="absolute end-3 flex items-center text-fg-muted">
              {rightIcon}
            </div>
          )}
        </div>
        {error && <p className="text-xs text-status-error font-medium">{error}</p>}
        {!error && helperText && <p className="text-xs text-fg-muted">{helperText}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
