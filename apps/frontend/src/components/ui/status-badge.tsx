import { Badge, BadgeProps } from "./badge";
import { cn } from "@/lib/utils";

type StatusType = 
  | "pending" 
  | "active" 
  | "suspended" 
  | "terminated" 
  | "inactive"
  | "approved"
  | "rejected"
  | "draft"
  | "sent"
  | "acknowledged"
  | "confirmed"
  | "partial"
  | "completed"
  | "cancelled"
  | "closed"
  | "picked_up"
  | "in_transit"
  | "out_for_delivery"
  | "delivered"
  | "exception";

interface StatusBadgeProps extends Omit<BadgeProps, "variant"> {
  status: StatusType;
}

const statusConfig: Record<StatusType, { variant: BadgeProps["variant"]; label: string }> = {
  pending: { variant: "warning", label: "Pending" },
  active: { variant: "success", label: "Active" },
  suspended: { variant: "destructive", label: "Suspended" },
  terminated: { variant: "destructive", label: "Terminated" },
  inactive: { variant: "secondary", label: "Inactive" },
  approved: { variant: "success", label: "Approved" },
  rejected: { variant: "destructive", label: "Rejected" },
  draft: { variant: "secondary", label: "Draft" },
  sent: { variant: "info", label: "Sent" },
  acknowledged: { variant: "success", label: "Acknowledged" },
  confirmed: { variant: "success", label: "Confirmed" },
  partial: { variant: "warning", label: "Partial" },
  completed: { variant: "success", label: "Completed" },
  cancelled: { variant: "destructive", label: "Cancelled" },
  closed: { variant: "secondary", label: "Closed" },
  picked_up: { variant: "info", label: "Picked Up" },
  in_transit: { variant: "info", label: "In Transit" },
  out_for_delivery: { variant: "info", label: "Out for Delivery" },
  delivered: { variant: "success", label: "Delivered" },
  exception: { variant: "destructive", label: "Exception" },
};

export function StatusBadge({ status, className, ...props }: StatusBadgeProps) {
  const config = statusConfig[status] || { variant: "default" as const, label: status };
  
  return (
    <Badge
      variant={config.variant}
      className={cn(className)}
      {...props}
    >
      {config.label}
    </Badge>
  );
}

