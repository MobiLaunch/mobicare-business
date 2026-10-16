// Vercel Serverless Function: /api/create-booking
// Handles repair appointment submissions and persists directly to Supabase.

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET,OPTIONS,PATCH,DELETE,POST,PUT",
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization",
  );

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST", "OPTIONS"]);
    return res.status(405).json({
      error: `Method ${req.method} Not Allowed. Please send a POST request.`,
    });
  }

  try {
    const booking = req.body || {};

    // Basic server-side validation — the client validates too, but never
    // trust the wire. Required: name, email, phone, service, date, time.
    const name = booking.name || booking.customer_name || "";
    const email = booking.email || booking.customer_email || "";
    const phone = booking.phone || booking.customer_phone || "";
    const service = booking.service || "";
    const apptDate = booking.date || booking.appt_date || "";
    const apptTime = booking.time || booking.appt_time || "";

    if (!name.trim() || !service.trim() || !apptDate || !apptTime) {
      return res.status(400).json({
        error:
          "Missing required booking fields (name, service, date, and time are required).",
      });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: "A valid email is required." });
    }
    if (!phone.trim()) {
      return res.status(400).json({ error: "A phone number is required." });
    }

    const sbUrl =
      process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const sbKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.SUPABASE_ANON_KEY ||
      process.env.VITE_SUPABASE_ANON_KEY;

    // If the customer is signed in, tie the booking to their account so it
    // shows up in their order/booking history. Best-effort: an invalid or
    // missing token just leaves the booking unattached, it never blocks
    // the submission.
    let userId = null;
    const authHeader = req.headers.authorization || "";
    const accessToken = authHeader.startsWith("Bearer ")
      ? authHeader.slice("Bearer ".length)
      : null;

    if (accessToken && sbUrl) {
      try {
        const whoResponse = await fetch(`${sbUrl.replace(/\/$/, "")}/auth/v1/user`, {
          headers: { apikey: sbKey, Authorization: `Bearer ${accessToken}` },
        });
        if (whoResponse.ok) {
          const who = await whoResponse.json().catch(() => null);
          userId = who?.id || null;
        }
      } catch {
        // Ignore — booking still proceeds unattached.
      }
    }

    const payload = {
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
      ...(userId ? { user_id: userId } : {}),
    };

    if (sbUrl && sbKey) {
      const dbResponse = await fetch(`${sbUrl.replace(/\/$/, "")}/rest/v1/bookings`, {
        method: "POST",
        headers: {
          apikey: sbKey,
          Authorization: `Bearer ${sbKey}`,
          "Content-Type": "application/json",
          Prefer: "return=representation",
        },
        body: JSON.stringify(payload),
      });

      if (!dbResponse.ok) {
        const errorData = await dbResponse.json().catch(() => ({}));
        console.error("Supabase booking insert error:", errorData);
        return res.status(500).json({
          error: errorData.message || "Failed to persist booking in database",
        });
      }

      const created = await dbResponse.json().catch(() => [payload]);
      return res.status(200).json({
        ok: true,
        booking: created[0] || payload,
      });
    }

    return res.status(200).json({
      ok: true,
      simulated: true,
      booking: payload,
    });
  } catch (error) {
    console.error("Booking API error:", error);
    return res.status(500).json({
      error: error.message || "Internal server error creating booking",
    });
  }
}
