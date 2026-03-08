import { cn } from "@/lib/utils";

interface OnlineIndicatorProps {
  isOnline: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeMap = {
  sm: "h-2 w-2",
  md: "h-2.5 w-2.5",
  lg: "h-3 w-3",
};

export function OnlineIndicator({ isOnline, size = "sm", className }: OnlineIndicatorProps) {
  return (
    <span
      className={cn(
        "rounded-full border shrink-0",
        sizeMap[size],
        isOnline
          ? "bg-foreground border-foreground shadow-[0_0_6px_hsl(145_80%_56%/0.6)]"
          : "bg-muted border-border",
        className
      )}
      title={isOnline ? "Online" : "Offline"}
    />
  );
}
