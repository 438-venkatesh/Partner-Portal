import { Card, CardContent, CardHeader, CardTitle } from "./card";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface SummaryCardProps {
  title: string;
  value: string | number;
  icon?: LucideIcon;
  iconColor?: string;
  trend?: {
    value: string;
    isPositive: boolean;
    label?: string;
  };
  loading?: boolean;
  onClick?: () => void;
  href?: string;
  children?: ReactNode;
  className?: string;
}

export function SummaryCard({
  title,
  value,
  icon: Icon,
  iconColor = "text-blue-600",
  trend,
  loading = false,
  onClick,
  href,
  children,
  className,
}: SummaryCardProps) {
  const content = (
    <Card className={cn("hover:shadow-md transition-shadow", onClick && "cursor-pointer", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {Icon && <Icon className={cn("h-4 w-4", iconColor)} />}
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-8 w-24 bg-muted animate-pulse rounded" />
        ) : (
          <>
            <div className="text-2xl font-bold">{value}</div>
            {trend && (
              <p className={cn(
                "text-xs mt-1",
                trend.isPositive ? "text-green-600" : "text-red-600"
              )}>
                {trend.isPositive ? "↑" : "↓"} {trend.value}
                {trend.label && <span className="text-muted-foreground ml-1">{trend.label}</span>}
              </p>
            )}
            {children}
          </>
        )}
      </CardContent>
    </Card>
  );

  if (href) {
    return <a href={href}>{content}</a>;
  }

  if (onClick) {
    return <div onClick={onClick}>{content}</div>;
  }

  return content;
}

