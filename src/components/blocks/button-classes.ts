/** Port of the reference's buttonClasses helper. */
export function buttonClasses({
  variant = 'primary',
  size = 'md',
  class: className = '',
}: {
  variant?: 'primary' | 'outline';
  size?: 'md' | 'lg';
  class?: string;
} = {}): string {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-md font-medium font-mukta transition-[color,background-color,border-color,box-shadow,transform] duration-150 ease-out active:scale-[0.97] motion-reduce:transition-none';
  const sizes = { md: 'px-4 py-2 text-sm', lg: 'px-6 py-3 text-base' }[size];
  const variants = {
    primary: 'bg-primary text-primary-foreground hover:bg-primary-dark',
    outline: 'border border-primary text-primary hover:bg-primary hover:text-primary-foreground',
  }[variant];
  return [base, sizes, variants, className].filter(Boolean).join(' ');
}
