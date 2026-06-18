import { cn } from '../../lib/utils';

const variants = {
  default:
    'bg-[var(--surface-2)] text-[var(--muted)] border-[var(--border)]',
  approved:
    'bg-[var(--success-soft)] text-[var(--success)] border-[color-mix(in_oklab,var(--success)_18%,transparent)]',
  review:
    'bg-[var(--primary-soft)] text-[var(--primary)] border-[color-mix(in_oklab,var(--primary)_18%,transparent)]',
  finance:
    'bg-[var(--review-soft)] text-[var(--review)] border-[color-mix(in_oklab,var(--review)_18%,transparent)]',
  warning:
    'bg-[var(--warning-soft)] text-[var(--warning)] border-[color-mix(in_oklab,var(--warning)_18%,transparent)]',
  danger:
    'bg-[var(--danger-soft)] text-[var(--danger)] border-[color-mix(in_oklab,var(--danger)_18%,transparent)]',
};

export function Badge({ className, variant = 'default', children, ...props }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2 py-0.5 text-[0.7rem] font-semibold tracking-wide leading-none',
        variants[variant],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}
