import React from 'react';
import { cn } from '@/lib/utils';

interface TaxDomeTableProps extends React.TableHTMLAttributes<HTMLTableElement> {
  children: React.ReactNode;
}

export const TaxDomeTable: React.FC<TaxDomeTableProps> = ({
  children,
  className,
  ...props
}) => {
  return (
    <div className="overflow-x-auto">
      <table
        className={cn(
          'w-full border-collapse',
          className
        )}
        {...props}
      >
        {children}
      </table>
    </div>
  );
};

interface TaxDomeTableHeaderProps extends React.HTMLAttributes<HTMLTableSectionElement> {
  children: React.ReactNode;
}

export const TaxDomeTableHeader: React.FC<TaxDomeTableHeaderProps> = ({
  children,
  className,
  ...props
}) => {
  return (
    <thead
      className={cn(
        'bg-gray-50 border-b border-gray-200',
        className
      )}
      {...props}
    >
      {children}
    </thead>
  );
};

interface TaxDomeTableRowProps extends React.HTMLAttributes<HTMLTableRowElement> {
  children: React.ReactNode;
}

export const TaxDomeTableRow: React.FC<TaxDomeTableRowProps> = ({
  children,
  className,
  ...props
}) => {
  return (
    <tr
      className={cn(
        'border-b border-gray-200 hover:bg-gray-50 transition-colors',
        className
      )}
      {...props}
    >
      {children}
    </tr>
  );
};

interface TaxDomeTableCellProps extends React.TdHTMLAttributes<HTMLTableCellElement> {
  children: React.ReactNode;
}

export const TaxDomeTableCell: React.FC<TaxDomeTableCellProps> = ({
  children,
  className,
  ...props
}) => {
  return (
    <td
      className={cn(
        'px-4 py-3 text-sm text-gray-900',
        className
      )}
      {...props}
    >
      {children}
    </td>
  );
};

interface TaxDomeTableHeaderCellProps extends React.ThHTMLAttributes<HTMLTableCellElement> {
  children: React.ReactNode;
}

export const TaxDomeTableHeaderCell: React.FC<TaxDomeTableHeaderCellProps> = ({
  children,
  className,
  ...props
}) => {
  return (
    <th
      className={cn(
        'px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider',
        className
      )}
      {...props}
    >
      {children}
    </th>
  );
};

