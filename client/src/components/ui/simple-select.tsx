import React from "react";
import { cn } from "@/lib/utils";

interface SimpleSelectProps {
  value?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
  children: React.ReactNode;
}

interface SimpleSelectItemProps {
  value: string;
  children: React.ReactNode;
  className?: string;
}

export function SimpleSelect({ 
  value, 
  onValueChange, 
  placeholder = "Selecione...", 
  className = "",
  children 
}: SimpleSelectProps) {
  return (
    <select
      value={value || ""}
      onChange={(e) => onValueChange?.(e.target.value)}
      className={cn(
        "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
    >
      {!value && <option value="" disabled>{placeholder}</option>}
      {children}
    </select>
  );
}

export function SimpleSelectItem({ value, children, className = "" }: SimpleSelectItemProps) {
  return (
    <option value={value} className={className}>
      {children}
    </option>
  );
}