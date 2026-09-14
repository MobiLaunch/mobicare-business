// Vercel Serverless Function: /api/create-booking
// Website booking -> shared Supabase booking -> NovaOps ticket trigger.

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST", "OPTIONS"]);
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const booking = req.body || {};
    const name = String(booking.name || booking.customer_name || "").trim();
    const email = String(booking.email || booking.customer_email || "").trim().toLowerCase();
    const phone = String(booking.phone || booking.customer_phone || "").trim();
    const service = String(booking.service || "").trim();
    const apptDate = booking.date || booking.appt_date || "";
    const apptTime = booking.time || booking.appt_time || "";

    if (!name || !service || !apptDate || !apptTime) {
      return res.status(400).json({ error: "Missing required booking fields." });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: "A valid email is required." });
    }
    if (!phone) return res.status(400).json({ error: "A phone number is required." });

    const sbUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!sbUrl || !serviceKey) {
      return res.status(503).json({ error: "Booking service is not configured." });
    }
    const base = sbUrl.replace(/\/$/, "");
    const headers = {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
    };

    // Resolve the single Mobicare business profile server-side. The browser
    // never supplies profile_id, preventing cross-tenant booking injection.
    const profileResponse = await fetch(
      `${base}/rest/v1/profiles?email=eq.mobicarehello%40gmail.com&select=id&limit=1`,
      { headers },
    );
    if (!profileResponse.ok) throw new Error("Unable to resolve business profile.");
    const profiles = await profileResponse.json();
    const profileId = profiles?.[0]?.id;
    if (!profileId) throw new Error("Mobicare business profile was not found.");

    // Optional customer auth is retained, but is never required for booking.
    let userId = null;
    const authHeader = req.headers.authorization || "";
    if (authHeader.startsWith("Bearer ")) {
      try {
        const whoResponse = await fetch(`${base}/auth/v1/user`, {
          headers: { apikey: serviceKey, Authorization: authHeader },
        });
        if (whoResponse.ok) userId = (await whoResponse.json())?.id || null;
      } catch {
        // Guest bookings remain valid.
      }
    }

    const payload = {
      profile_id: profileId,
      ...(userId ? { user_id: userId } : {}),
      customer_name: name,
      customer_email: email,
      customer_phone: phone,
      service,
      device_type: booking.deviceType || booking.device_type || "",
      device_model: booking.deviceModel || booking.device_model || "",
      issue: booking.issue || "",
      appt_date: apptDate,
      appt_time: apptTime,
      notes: booking.notes || "",
      visit_type: booking.visit_type || booking.visitType || "in-store",
      visit_location_type: booking.visit_location_type || booking.visitLocationType || null,
      home_address: booking.home_address || booking.homeAddress || "",
      status: "pending",
    };

    const dbResponse = await fetch(`${base}/rest/v1/bookings?select=*`, {
      method: "POST",
      headers: { ...headers, Prefer: "return=representation" },
      body: JSON.stringify(payload),
    });

    if (!dbResponse.ok) {
      const detail = await dbResponse.text();
      console.error("Supabase booking insert error:", detail);
      return res.status(500).json({ error: "Failed to create booking." });
    }

    const created = await dbResponse.json();
    const bookingRow = created?.[0];

    return res.status(200).json({
      ok: true,
      booking: bookingRow || payload,
      ticket_id: bookingRow?.novaops_ticket_id || null,
      message: bookingRow?.novaops_ticket_id
        ? "Booking confirmed and NovaOps ticket created."
        : "Booking received.",
    });
  } catch (error) {
    console.error("Booking API error:", error);
    return res.status(500).json({ error: error.message || "Internal server error." });
  }
}
