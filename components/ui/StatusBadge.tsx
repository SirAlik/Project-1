import React from "react";

interface Props {
    status: string;
}

export function StatusBadge({ status }: Props) {
    let label = status;
    let colorClass = "bg-muted text-muted-foreground border-border";

    switch (status) {
        // Case Statuses
        case "مفتوحة":
        case "جديد":
            colorClass = "bg-success/10 text-success border-success/20";
            break;
        case "تحت الإجراء":
            colorClass = "bg-primary/10 text-primary border-primary/20";
            break;
        case "محولة للموجه الطلابي":
            colorClass = "bg-warning/10 text-warning border-warning/20";
            break;
        case "مغلقة":
            colorClass = "bg-destructive/10 text-destructive border-destructive/20 line-through decoration-destructive/50";
            break;

        // Secretary/Correspondence Statuses
        case "draft":
            label = "مسودة";
            colorClass = "bg-muted text-muted-foreground border-border";
            break;
        case "pending":
            label = "قيد الانتظار";
            colorClass = "bg-warning/10 text-warning border-warning/20";
            break;
        case "received":
            label = "تم الاستلام";
            colorClass = "bg-primary/10 text-primary border-primary/20";
            break;
        case "processed":
            label = "تمت المعالجة";
            colorClass = "bg-success/10 text-success border-success/20";
            break;
        case "sent":
            label = "تم الإرسال";
            colorClass = "bg-primary/10 text-primary border-primary/20";
            break;
        case "archived":
            label = "مؤرشف";
            colorClass = "bg-secondary text-secondary-foreground border-border";
            break;

        // Leave/Procurement Statuses
        case "approved":
            label = "موافقة";
            colorClass = "bg-success/10 text-success border-success/20";
            break;
        case "rejected":
            label = "مرفوض";
            colorClass = "bg-destructive/10 text-destructive border-destructive/20";
            break;
    }

    return (
        <span
            className={`inline-flex items-center rounded-lg border px-2 py-0.5 text-xs font-medium ${colorClass}`}
        >
            {label}
        </span>
    );
}
