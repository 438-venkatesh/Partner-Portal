import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Eye, Edit } from "lucide-react";
import { Link } from "@tanstack/react-router";
import type { PartnerResponse } from "@partner-portal/common";

interface PartnerListProps {
  partners: PartnerResponse[];
}

const columns: ColumnDef<PartnerResponse>[] = [
  {
    accessorKey: "partnerName",
    header: "Partner Name",
    cell: ({ row }) => (
      <div className="font-medium">{row.getValue("partnerName")}</div>
    ),
  },
  {
    accessorKey: "partnerCode",
    header: "Partner Code",
  },
  {
    accessorKey: "partnerType",
    header: "Type",
    cell: ({ row }) => {
      const type = row.getValue("partnerType") as string;
      return <span className="capitalize">{type.replace("_", " ")}</span>;
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.getValue("status") as string;
      return <StatusBadge status={status as any} />;
    },
  },
  {
    accessorKey: "tier",
    header: "Tier",
    cell: ({ row }) => {
      const tier = row.getValue("tier") as string | null;
      return tier ? <span className="capitalize">{tier}</span> : <span className="text-muted-foreground">-</span>;
    },
  },
  {
    accessorKey: "registrationDate",
    header: "Registration Date",
    cell: ({ row }) => {
      const date = row.getValue("registrationDate") as Date;
      return new Date(date).toLocaleDateString();
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const partner = row.original;
      return (
        <div className="flex items-center space-x-2">
          <Link to="/partners/$partnerId" params={{ partnerId: partner.partnerId }}>
            <Button variant="ghost" size="icon">
              <Eye className="h-4 w-4" />
            </Button>
          </Link>
          <Link to="/partners/$partnerId" params={{ partnerId: partner.partnerId }}>
            <Button variant="ghost" size="icon" aria-label="Edit partner">
              <Edit className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      );
    },
  },
];

export function PartnerList({ partners }: PartnerListProps) {
  return <DataTable columns={columns} data={partners} searchPlaceholder="Search partners..." />;
}

