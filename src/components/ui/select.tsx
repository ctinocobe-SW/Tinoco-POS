import { forwardRef, type SelectHTMLAttributes } from 'react'
import { cn } from '@/lib/utils/cn'

const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, ...props }, ref) => (
    <select
      className={cn(
        'w-full bg-white border border-border rounded-md px-3 py-2.5 text-sm text-foreground',
        'focus:outline-none focus:ring-1 focus:ring-brand-accent transition-colors',
        'disabled:opacity-60 disabled:cursor-not-allowed',
        className
      )}
      ref={ref}
      {...props}
    />
  )
)
Select.displayName = 'Select'

export { Select }
