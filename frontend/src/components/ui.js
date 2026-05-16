import React from 'react';
import clsx from 'clsx';

export const Button = ({ variant = 'primary', size = 'md', children, className, disabled, ...rest }) => {
  const base = 'inline-flex items-center justify-center gap-2 font-medium tracking-wide rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-indigo-500/30';
  const sizes = {
    sm: 'text-xs px-3 py-1.5',
    md: 'text-sm px-4 py-2',
    lg: 'text-sm px-5 py-2.5',
  };
  const variants = {
    primary: 'bg-slate-900 hover:bg-slate-800 text-white',
    secondary: 'bg-white hover:bg-slate-50 text-slate-900 border border-slate-200',
    ai: 'bg-indigo-600 hover:bg-indigo-700 text-white',
    ghost: 'text-slate-600 hover:bg-slate-100',
    danger: 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200',
  };
  return (
    <button
      {...rest}
      disabled={disabled}
      className={clsx(base, sizes[size], variants[variant], className)}
    >
      {children}
    </button>
  );
};

export const Input = React.forwardRef(({ error, className, ...rest }, ref) => (
  <input
    ref={ref}
    {...rest}
    className={clsx(
      'w-full bg-white border rounded-lg px-3 py-2 text-sm font-manrope focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-colors',
      error ? 'border-rose-300 focus:border-rose-500' : 'border-slate-200 focus:border-indigo-500',
      className
    )}
  />
));
Input.displayName = 'Input';

export const Textarea = ({ error, className, ...rest }) => (
  <textarea
    {...rest}
    className={clsx(
      'w-full bg-white border rounded-lg px-3 py-2 text-sm font-manrope resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-colors',
      error ? 'border-rose-300 focus:border-rose-500' : 'border-slate-200 focus:border-indigo-500',
      className
    )}
  />
);

export const Select = ({ children, error, className, ...rest }) => (
  <select
    {...rest}
    className={clsx(
      'w-full bg-white border rounded-lg px-3 py-2 text-sm font-manrope focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-colors',
      error ? 'border-rose-300 focus:border-rose-500' : 'border-slate-200 focus:border-indigo-500',
      className
    )}
  >
    {children}
  </select>
);

export const Label = ({ children, required, className }) => (
  <label className={clsx('text-xs font-manrope uppercase tracking-[0.18em] font-bold text-slate-500', className)}>
    {children}
    {required && <span className="text-rose-500 ml-1 normal-case tracking-normal">*</span>}
  </label>
);

export const Card = ({ children, className, ...rest }) => (
  <div
    {...rest}
    className={clsx('bg-white border border-slate-200 rounded-xl', className)}
  >
    {children}
  </div>
);

export const Badge = ({ variant = 'gray', children, className }) => {
  const variants = {
    high: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    medium: 'bg-amber-50 text-amber-700 border-amber-200',
    low: 'bg-rose-50 text-rose-700 border-rose-200',
    none: 'bg-slate-50 text-slate-500 border-slate-200',
    gray: 'bg-slate-50 text-slate-600 border-slate-200',
    indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  };
  return (
    <span className={clsx('inline-flex items-center text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border', variants[variant], className)}>
      {children}
    </span>
  );
};

export const ConfidenceBadge = ({ confidence }) => {
  const map = {
    high: { variant: 'high', label: 'High' },
    medium: { variant: 'medium', label: 'Medium' },
    low: { variant: 'low', label: 'Low' },
    none: { variant: 'none', label: 'Not found' },
  };
  const c = map[confidence] || map.none;
  return (
    <Badge variant={c.variant} className="!normal-case !tracking-wider" data-testid={`confidence-badge-${confidence}`}>
      {c.label}
    </Badge>
  );
};
