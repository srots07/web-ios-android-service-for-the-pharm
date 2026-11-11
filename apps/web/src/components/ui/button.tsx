import * as React from "react";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "destructive" | "link";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
}

const variantClassMap: Record<NonNullable<ButtonProps["variant"]>, string> = {
  primary: "primary-button",
  secondary: "secondary-button",
  outline: "outline-button",
  ghost: "ghost-button",
  destructive: "destructive-button",
  link: "ghost-button",
};

const sizeClassMap: Record<NonNullable<ButtonProps["size"]>, string> = {
  sm: "button-sm",
  md: "",
  lg: "button-lg",
};

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      isLoading = false,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          variantClassMap[variant],
          sizeClassMap[size],
          isLoading && "opacity-75 cursor-wait pointer-events-none",
          className
        )}
        {...props}
      >
        {isLoading && <Loader2 className="animate-spin" size={16} />}
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";

export { Button };
