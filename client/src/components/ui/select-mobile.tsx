// Mobile-optimized Select - usa native select em mobile para melhor UX
import * as React from "react"
import { cn } from "@/lib/utils"

export interface SelectMobileProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  options: { value: string; label: string }[]
}

const SelectMobile = React.forwardRef<HTMLSelectElement, SelectMobileProps>(
  ({ className, options, ...props }, ref) => {
    return (
      <select
        className={cn(
          "flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 min-h-touch touch-manipulation appearance-none",
          "md:text-sm",
          className
        )}
        ref={ref}
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    )
  }
)
SelectMobile.displayName = "SelectMobile"

export { SelectMobile }
