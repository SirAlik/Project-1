export type InventoryItem = {
    id: string;
    name: string;
    category: "Chemical" | "Glassware" | "Equipment" | "Other";
    quantity: number;
    unit: string;
    location: string;
    status: "available" | "low_stock" | "out_of_stock";
    updated_at: string;
};

export type Experiment = {
    id: string;
    title: string;
    grade_level: number;
    required_items: { name: string; qty: string }[];
    description: string | null;
};

export type LabBooking = {
    id: string;
    booking_date: string;
    period: number;
    teacher_id: string;
    teacher_name: string;
    experiment_id: string | null;
    experiment_title: string | null;
    status: "pending" | "approved" | "rejected" | "completed";
    created_at: string;
};
