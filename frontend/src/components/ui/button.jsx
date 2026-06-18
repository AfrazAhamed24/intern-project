import { cn } from '../../lib/utils';

const variants = {
  default:
    'bg-[var(--primary)] text-white hover:bg-[var(--primary-strong)] shadow-[0_4px_14px_rgba(37,99,235,0.15)] active:scale-[0.97]',
  secondary:
    'border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] hover:bg-[var(--surface-2)] active:scale-[0.97]',
  ghost:
    'text-[var(--text)] hover:bg-[var(--surface-2)] active:scale-[0.97]',
  danger:
    'bg-[var(--danger)] text-white hover:bg-[#b91c1c] shadow-[0_4px_14px_rgba(220,38,38,0.15)] active:scale-[0.97]',
  success:
    'bg-[var(--success)] text-white hover:bg-[#15803d] shadow-[0_4px_14px_rgba(22,163,74,0.15)] active:scale-[0.97]',
  outline:
    'border border-[var(--border)] bg-transparent text-[var(--text)] hover:bg-[var(--surface-2)] active:scale-[0.97]',
  subtle:
    'bg-[var(--primary-soft)] text-[var(--primary)] hover:bg-[color-mix(in_oklab,var(--primary-soft)_80%,transparent)] active:scale-[0.97]',
};

const sizes = {
  sm: 'h-9 px-3 text-xs',
  md: 'h-10 px-4 text-sm',
  lg: 'h-11 px-5 text-sm',
  xl: 'h-12 px-6 text-sm',
};

export function Button({ className, variant = 'default', size = 'md', asChild = false, children, type, ...props }) {
  const Comp = asChild ? 'span' : 'button';
  return (
    <Comp
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-[10px] font-semibold tracking-tight transition-all duration-150 outline-none focus:ring-4 focus:ring-[var(--focus-ring)] disabled:pointer-events-none disabled:opacity-50 cursor-pointer',
        variants[variant],
        sizes[size],
        className,
      )}
      type={asChild ? undefined : type || 'button'}
      {...props}
    >
      {children}
    </Comp>
  );
}
