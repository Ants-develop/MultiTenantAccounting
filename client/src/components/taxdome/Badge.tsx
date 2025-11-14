import React from 'react';
import { cn } from '@/lib/utils';

interface TaxDomeBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'success' | 'warning' | 'error' | 'info' | 'gray';
  size?: 'sm' | 'md';
  children: React.ReactNode;
}

export const TaxDomeBadge: React.FC<TaxDomeBadgeProps> = ({
  variant = 'gray',
  size = 'md',
  className,
  children,
  ...props
}) => {
  const variantClasses = {
    success: 'bg-green-100 text-green-700',
    warning: 'bg-amber-100 text-amber-700',
    error: 'bg-red-100 text-red-700',
    info: 'bg-blue-100 text-blue-700',
    gray: 'bg-gray-100 text-gray-700',
  };

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center font-medium rounded-full',
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
};

