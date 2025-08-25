'use client'

import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline:
          "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        gradient: "bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200",
        success: "bg-green-600 text-white hover:bg-green-700",
        warning: "bg-yellow-600 text-white hover:bg-yellow-700",
        info: "bg-blue-600 text-white hover:bg-blue-700",
      },
      size: {
        default: "h-10 px-4 py-2",
        xs: "h-7 px-2 text-xs",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        xl: "h-12 rounded-lg px-10 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  loading?: boolean
  loadingText?: string
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  fullWidth?: boolean
}

const EnhancedButton = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ 
    className, 
    variant, 
    size, 
    asChild = false, 
    loading = false,
    loadingText,
    leftIcon,
    rightIcon,
    fullWidth = false,
    children,
    disabled,
    ...props 
  }, ref) => {
    const Comp = asChild ? Slot : "button"
    
    const isDisabled = disabled || loading

    return (
      <Comp
        className={cn(
          buttonVariants({ variant, size, className }),
          fullWidth && "w-full",
          loading && "cursor-wait"
        )}
        ref={ref}
        disabled={isDisabled}
        {...props}
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {loadingText || "Loading..."}
          </>
        ) : (
          <>
            {leftIcon && <span className="mr-2">{leftIcon}</span>}
            {children}
            {rightIcon && <span className="ml-2">{rightIcon}</span>}
          </>
        )}
      </Comp>
    )
  }
)
EnhancedButton.displayName = "EnhancedButton"

// Async button that handles promises
interface AsyncButtonProps extends Omit<ButtonProps, 'loading'> {
  onClick?: () => Promise<void> | void
  successMessage?: string
  errorMessage?: string
}

const AsyncButton = React.forwardRef<HTMLButtonElement, AsyncButtonProps>(
  ({ 
    onClick,
    successMessage,
    errorMessage,
    children,
    ...props 
  }, ref) => {
    const [loading, setLoading] = React.useState(false)

    const handleClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
      if (!onClick || loading) return

      setLoading(true)
      try {
        await onClick()
        if (successMessage) {
          // You could integrate with your toast system here
          console.log(successMessage)
        }
      } catch (error) {
        if (errorMessage) {
          console.error(errorMessage, error)
        }
      } finally {
        setLoading(false)
      }
    }

    return (
      <EnhancedButton
        {...props}
        ref={ref}
        loading={loading}
        onClick={handleClick}
      >
        {children}
      </EnhancedButton>
    )
  }
)
AsyncButton.displayName = "AsyncButton"

// Button group component
interface ButtonGroupProps {
  children: React.ReactNode
  orientation?: 'horizontal' | 'vertical'
  size?: VariantProps<typeof buttonVariants>['size']
  variant?: VariantProps<typeof buttonVariants>['variant']
  className?: string
  fullWidth?: boolean
}

const ButtonGroup = ({ 
  children, 
  orientation = 'horizontal',
  size,
  variant,
  className,
  fullWidth = false
}: ButtonGroupProps) => {
  return (
    <div
      className={cn(
        "flex",
        orientation === 'horizontal' ? "flex-row" : "flex-col",
        fullWidth && "w-full",
        className
      )}
    >
      {React.Children.map(children, (child, index) => {
        if (!React.isValidElement(child)) return child

        const isFirst = index === 0
        const isLast = index === React.Children.count(children) - 1
        
        return React.cloneElement(child as React.ReactElement<ButtonProps>, {
          size: child.props.size || size,
          variant: child.props.variant || variant,
          className: cn(
            child.props.className,
            orientation === 'horizontal' ? [
              !isFirst && !isLast && "rounded-none",
              isFirst && "rounded-r-none",
              isLast && "rounded-l-none",
              !isFirst && "border-l-0"
            ] : [
              !isFirst && !isLast && "rounded-none",
              isFirst && "rounded-b-none",
              isLast && "rounded-t-none",
              !isFirst && "border-t-0"
            ],
            fullWidth && "flex-1"
          )
        })
      })}
    </div>
  )
}

// Confirmation button (integrates with confirmation dialog)
interface ConfirmationButtonProps extends ButtonProps {
  confirmTitle: string
  confirmDescription: string
  onConfirm: () => void | Promise<void>
  requiresTyping?: boolean
  typingConfirmation?: string
}

const ConfirmationButton = React.forwardRef<HTMLButtonElement, ConfirmationButtonProps>(
  ({ 
    confirmTitle,
    confirmDescription,
    onConfirm,
    requiresTyping = false,
    typingConfirmation = 'DELETE',
    children,
    onClick,
    ...props 
  }, ref) => {
    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      e.preventDefault()
      
      // This would integrate with your confirmation dialog system
      const confirmed = window.confirm(`${confirmTitle}\n\n${confirmDescription}`)
      if (confirmed) {
        onConfirm()
      }
    }

    return (
      <EnhancedButton
        {...props}
        ref={ref}
        onClick={handleClick}
      >
        {children}
      </EnhancedButton>
    )
  }
)
ConfirmationButton.displayName = "ConfirmationButton"

// Floating Action Button
interface FABProps extends ButtonProps {
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'
}

const FloatingActionButton = React.forwardRef<HTMLButtonElement, FABProps>(
  ({ 
    position = 'bottom-right',
    className,
    size = 'lg',
    variant = 'gradient',
    ...props 
  }, ref) => {
    const positionClasses = {
      'bottom-right': 'bottom-6 right-6',
      'bottom-left': 'bottom-6 left-6',
      'top-right': 'top-6 right-6',
      'top-left': 'top-6 left-6'
    }

    return (
      <EnhancedButton
        {...props}
        ref={ref}
        size={size}
        variant={variant}
        className={cn(
          "fixed z-50 rounded-full shadow-lg hover:shadow-xl transition-all duration-200",
          positionClasses[position],
          className
        )}
      />
    )
  }
)
FloatingActionButton.displayName = "FloatingActionButton"

export { 
  EnhancedButton, 
  AsyncButton,
  ButtonGroup,
  ConfirmationButton,
  FloatingActionButton,
  buttonVariants 
}