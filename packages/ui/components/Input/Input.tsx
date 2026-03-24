import React, 'react';
import { cn } from 'classnames';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  variant?: 'default' | 'filled' | 'flush';
  size?: 'sm' | 'md' | 'lg';
  error?: boolean;
  errorMessage?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const variantClasses: Record<InputProps['variant'], string> = {
  default: 'bg-white border border-gray-200',
  filled: 'bg-gray-50 border border-transparent',
  flush: 'bg-transparent border-b border-gray-300',
};

const sizeClasses: Record<InputProps['size'], string> = {
  sm: 'px-2 py-1.5 text-sm',
  md: 'px-3 py-2 text-base',
  lg: 'px-4 py-3 text-lg',
};

export const Input: React.FC<InputProps> = ({
  variant = 'default',
  size = 'md',
  error = false,
  errorMessage,
  leftIcon,
  rightIcon,
  className,
  ...props,
}) => {
  const baseClasses = cn(
    'rounded-lg border transition-all duration-200',
    'focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-opacity-50',
    variantClasses[variant],
    sizeClasses[size],
    error && 'border-[var(--error)] focus:ring-[var(--error)]',
    className
  className={baseClasses}
    ...props
  >
    {leftIcon && (
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
        {leftIcon}
      </span>
    )}
    <input
      className={cn(
        'w-full bg-transparent border-0 focus:outline-none',
        sizeClasses[size],
        'pl-10 pr-4',
        error && 'pr-10'
      )}
      {...props}
    />
    {rightIcon && (
      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
        {rightIcon}
      </span>
    )}
    {error && errorMessage && (
      <p className="mt-1 text-sm text-[var(--error)]">{errorMessage}</p>
    )}
  </div>
);

export default Input;
