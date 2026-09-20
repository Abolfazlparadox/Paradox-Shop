import React, { forwardRef } from 'react';
import { cn } from '@/lib/utils/cn';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'group relative inline-flex items-center justify-center font-medium transition-all duration-200 ease-out-cubic focus-ring disabled:opacity-40 disabled:pointer-events-none cursor-pointer select-none active:scale-[0.97]';

    const variants = {
      primary:
        'bg-accent text-accent-fg hover:opacity-90 hover:shadow-glow shadow-subtle border border-transparent',
      secondary:
        'bg-bg-elevated text-fg-primary hover:bg-border-subtle hover:border-border-accent border border-border-subtle shadow-subtle',
      outline:
        'bg-transparent text-fg-primary border border-border-accent hover:border-fg-primary hover:bg-bg-secondary hover:shadow-subtle',
      ghost:
        'bg-transparent text-fg-secondary hover:text-fg-primary hover:bg-bg-secondary',
      danger:
        'bg-status-error text-white hover:opacity-90 border border-transparent shadow-subtle',
    };

    const sizes = {
      sm: 'text-xs h-8 px-3 rounded-sm gap-1.5',
      md: 'text-sm h-10 px-4 rounded-md gap-2',
      lg: 'text-base h-12 px-6 rounded-md gap-2.5',
      icon: 'h-10 w-10 p-0 rounded-md',
    };

    return (
      <button
        ref={ref}
        data-cursor="action"
        disabled={disabled || isLoading}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {isLoading && <Loader2 className="w-4 h-4 animate-spin shrink-0" />}
        {!isLoading && leftIcon && (
          <span className="shrink-0 transition-transform duration-200 group-hover:-translate-x-0.5">
            {leftIcon}
          </span>
        )}
        {children}
        {!isLoading && rightIcon && (
          <span className="shrink-0 transition-transform duration-200 group-hover:translate-x-0.5">
            {rightIcon}
          </span>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';

