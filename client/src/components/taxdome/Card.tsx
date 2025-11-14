import React from 'react';
import { cn } from '@/lib/utils';

interface TaxDomeCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  variant?: 'default' | 'elevated' | 'outlined';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export const TaxDomeCard: React.FC<TaxDomeCardProps> = ({
  children,
  variant = 'default',
  padding = 'lg',
  className,
  ...props
}) => {
  const paddingClasses = {
    none: '',
    sm: 'p-2',
    md: 'p-4',
    lg: 'p-6',
  };

  const variantClasses = {
    default: 'bg-white border border-gray-200 shadow-sm',
    elevated: 'bg-white border border-gray-200 shadow-md',
    outlined: 'bg-white border-2 border-gray-300 shadow-none',
  };

  return (
    <div
      className={cn(
        'rounded-lg transition-shadow duration-200',
        variantClasses[variant],
        paddingClasses[padding],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

