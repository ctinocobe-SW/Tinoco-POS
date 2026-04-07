import { forwardRef, type InputHTMLAttributes } from 'react'
import { cn } from '@/lib/utils/cn'

const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      className={cn(
        'w-full bg-white border border-border rounded-md px-3 py-2.5 text-sm text-foreground',
        'focus:outline-none focus:ring-1 focus:ring-brand-accent transition-colors',
        'placeholder:text-muted-foreground disabled:opacity-60 disabled:cursor-not-allowed',
        className
      )}
      ref={ref}
      {...props}
    />
  )
)
Input.displayName = 'Input'

export { Input }
