import { forwardRef, type LabelHTMLAttributes } from 'react'
import { cn } from '@/lib/utils/cn'

const Label = forwardRef<HTMLLabelElement, LabelHTMLAttributes<HTMLLabelElement>>(
  ({ className, ...props }, ref) => (
    <label
      className={cn('text-xs text-muted-foreground uppercase tracking-wide', className)}
      ref={ref}
      {...props}
    />
  )
)
Label.displayName = 'Label'

export { Label }
