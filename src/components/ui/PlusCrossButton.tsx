import React from "react";
import { cn } from "@/lib/utils";

interface PlusCrossButtonProps {
  active?: boolean;
  onClick?: (e: React.MouseEvent) => void;
  className?: string;
  size?: string;
  activeColor?: 'destructive' | 'success' | 'primary';
}

export const PlusCrossButton = ({ active, onClick, className, size = '24px', activeColor = 'destructive' }: PlusCrossButtonProps) => {
  const Comp = onClick ? 'button' : 'div' as any;
  const colorMap = {
    destructive: "active text-destructive hover:text-destructive/80",
    success: "active text-success hover:text-success/80",
    primary: "active text-primary hover:text-primary/80"
  };

  return (
    <Comp
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={cn(
        "btn-plus-cross transition-all duration-300 hover:scale-110 flex-shrink-0",
        active ? colorMap[activeColor] : "text-slate-400 hover:text-primary",
        className
      )}
      style={{ '--pc-size': size } as React.CSSProperties}
    />
  );
};
