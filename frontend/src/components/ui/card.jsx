import { cn } from '../../lib/utils';

export function Card({ className, children, ...props }) {
  return (
    <div
      className={cn('rounded-[16px] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-sm)]', className)}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className, children, ...props }) {
  return <div className={cn('border-b border-[var(--border)]/70 px-5 py-4', className)} {...props}>{children}</div>;
}

export function CardTitle({ className, children, ...props }) {
  return <h3 className={cn('text-sm font-semibold tracking-tight text-[var(--text-strong)]', className)} {...props}>{children}</h3>;
}

export function CardDescription({ className, children, ...props }) {
  return <p className={cn('mt-0.5 text-xs text-[var(--muted)]', className)} {...props}>{children}</p>;
}

export function CardContent({ className, children, ...props }) {
  return <div className={cn('px-5 py-4', className)} {...props}>{children}</div>;
}
