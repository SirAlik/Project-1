import { useState, useEffect, useRef, useCallback, startTransition } from "react";

import { useAuth } from "@/app/_context/AuthContext";
import { InventoryItem, LabBooking, Experiment } from "@/lib/types/science";

export function useScience() {
    const { user, role, supabase } = useAuth();

    // State
    const [msg, setMsg] = useState("");
    const [loading, setLoading] = useState(false);

    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [bookings, setBookings] = useState<LabBooking[]>([]);
    const [experiments, setExperiments] = useState<Experiment[]>([]);

    const [profileCache, setProfileCache] = useState<{ userId: string; name: string | null } | null>(null);
    const profileFetchRef = useRef<string | null>(null);
    const userId = user?.id ?? null;
    const metaName: string | null = user
        ? (user.user_metadata?.full_name ?? user.user_metadata?.name ?? user.email ?? null)
        : null;
    const currentUserName: string | null = user
        ? ((profileCache?.userId === user.id ? profileCache.name : null) ?? metaName)
        : null;

    useEffect(() => {
        if (!userId) return;
        if (profileFetchRef.current === userId) return;
        profileFetchRef.current = userId;
        startTransition(async () => {
            const { data } = await supabase.from("profiles").select("full_name, name").eq("id", userId).single();
            if (data) setProfileCache({ userId, name: data.full_name ?? data.name ?? null });
        });
    }, [userId, supabase]);

    // Loaders
    const loadInventory = useCallback(async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from("lab_inventory")
            .select("*")
            .order("name");

        if (error) setMsg(error.message);
        else setInventory((data || []) as InventoryItem[]);
        setLoading(false);
    }, [supabase]);

    const loadBookings = useCallback(async () => {
        const { data, error } = await supabase
            .from("lab_bookings")
            .select("*")
            .order("booking_date", { ascending: false });

        if (error) setMsg(error.message);
        else setBookings((data || []) as LabBooking[]);
    }, [supabase]);

    const loadExperiments = useCallback(async () => {
        const { data, error } = await supabase.from("lab_experiments").select("*");
        if (error) setMsg(error.message);
        else setExperiments((data || []) as Experiment[]);
    }, [supabase]);

    // Actions
    async function requestBooking(date: string, period: number, experimentId?: string) {
        setMsg("");

        // Find existing to prevent double booking?
        const existing = bookings.find(b => b.booking_date === date && b.period === period);
        if (existing) {
            setMsg("Error: This slot is already booked.");
            return false;
        }

        const exp = experiments.find(e => e.id === experimentId);

        const { error } = await supabase.from("lab_bookings").insert([{
            booking_date: date,
            period,
            teacher_id: user?.id, // Mock ID or real Auth ID
            teacher_name: currentUserName,
            experiment_id: experimentId,
            experiment_title: exp?.title,
            status: "pending"
        }]);

        if (error) {
            setMsg(error.message);
            return false;
        }

        setMsg("✅ Booking requested successfully");
        loadBookings();
        return true;
    }

    async function updateBookingStatus(id: string, status: LabBooking["status"]) {
        const { error } = await supabase
            .from("lab_bookings")
            .update({ status })
            .eq("id", id);

        if (error) setMsg(error.message);
        else {
            setMsg(`✅ Booking ${status}`);
            loadBookings();
        }
    }

    // Init
    useEffect(() => {
        startTransition(async () => {
            await loadInventory();
            await loadBookings();
            await loadExperiments();
        });
    }, [loadInventory, loadBookings, loadExperiments]);

    return {
        state: {
            inventory, bookings, experiments,
            msg, loading, user, role
        },
        actions: {
            setMsg,
            loadInventory,
            requestBooking,
            updateBookingStatus
        }
    };
}
