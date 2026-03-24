import React from 'react';
import { cn, className, size } from 'classnames';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
}

const variantClasses: Record<ButtonProps['variant'], string> = {
  primary: 'bg-[var(--primary)] hover:bg-[var(--primary-dark)] text-white',
  secondary: 'bg-gray-100 hover:bg-gray-200 text-gray-700',
  outline: 'border-2 border-[var(--primary)] text-[var(--primary)] hover:bg-gray-50',
  ghost: 'bg-transparent hover:bg-gray-100 text-gray-500',
  danger: 'bg-[var(--error)] hover:bg-red-600 text-white',
};

const sizeClasses: Record<ButtonProps['size'], string> = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-base',
  lg: 'px-6 py-3 text-lg',
};

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  loading = false,
  disabled = false,
  className,
  icon,
  children,
  ...props,
}) => {
  const baseClasses = cn(
    'inline-flex items-center justify-center rounded-lg font-medium transition-all duration-200',
    'disabled:opacity-50 cursor-not-allowed',
    variantClasses[variant],
    sizeClasses[size],
    fullWidth && 'w-full',
    loading && 'cursor-wait'
  className
  className={baseClasses}
    disabled={disabled || loading}
    {...props}
  >
    {icon && <span className="mr-2">{icon}</span>}
    {loading && (
      <svg
        className="animate-spin h-5 w-5"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
        />
      </svg>
    )}
    {children}
  </Button>
  );
};

export default Button;
