// Fallback / helper handler for booking submission
import { getClient } from "@/lib/supabase";

export async function insertBookingDirect(
  booking: Record<string, unknown>,
): Promise<boolean> {
  const sb = getClient();

  if (!sb) return false;

  const payload = {
    customer_name: booking.name || booking.customer_name || "",
    customer_email: booking.email || booking.customer_email || "",
    customer_phone: booking.phone || booking.customer_phone || "",
    service: booking.service || "",
    device_type: booking.deviceType || booking.device_type || "",
    device_model: booking.deviceModel || booking.device_model || "",
    issue: booking.issue || "",
    appt_date: booking.date || booking.appt_date || "",
    appt_time: booking.time || booking.appt_time || "",
    notes: booking.notes || "",
    visit_type: booking.visit_type || booking.visitType || "in-store",
    home_address: booking.home_address || booking.homeAddress || "",
    status: "pending",
  };

  const { error } = await sb.from("bookings").insert(payload);

  if (error) {
    console.error("Direct Supabase booking insert error:", error);
    throw new Error(error.message || "Unable to submit booking.");
  }

  return true;
}
