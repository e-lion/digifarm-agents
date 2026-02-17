import { ButtonHTMLAttributes, forwardRef } from 'react'
import { Loader2 } from 'lucide-react'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger'
  size?: 'default' | 'sm' | 'lg'
  isLoading?: boolean
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'default', isLoading, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          'inline-flex items-center justify-center rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98]',
          // Touch target size assurance
          'min-h-[48px] min-w-[48px]',
          {
            'bg-green-700 text-white hover:bg-green-800 focus-visible:ring-green-700': variant === 'primary',
            'bg-gray-100 text-gray-900 hover:bg-gray-200 focus-visible:ring-gray-500': variant === 'secondary',
            'border-2 border-gray-300 bg-transparent hover:bg-gray-50 text-gray-700': variant === 'outline',
            'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-600': variant === 'danger',
            'px-4 py-2 text-base': size === 'default',
            'px-3 py-1 text-sm': size === 'sm',
            'px-8 py-4 text-lg': size === 'lg',
          },
          className
        )}
        {...props}
      >
        {isLoading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
        {children}
      </button>
    )
  }
)
Button.displayName = 'Button'

export { Button }
