import { applyCors, resolveUserIdFromAuth } from "./_order-pricing.js";

// Vercel Serverless Function: /api/create-booking
// Validates repair appointment submissions in America/Chicago time, checks
// Fairfield ~25-mile Home Visit coverage & slot availability, and persists
// to Supabase using SUPABASE_SERVICE_ROLE_KEY.

const WEEKDAY_SLOTS = new Set([
  "9:00 AM",
  "10:00 AM",
  "11:00 AM",
  "12:00 PM",
  "1:00 PM",
  "2:00 PM",
  "3:00 PM",
  "4:00 PM",
  "5:00 PM",
]);

const SATURDAY_SLOTS = new Set([
  "10:00 AM",
  "11:00 AM",
  "12:00 PM",
  "1:00 PM",
  "2:00 PM",
  "3:00 PM",
]);

const LOCAL_TOWNS = [
  "fairfield",
  "wayne city",
  "cisne",
  "geff",
  "jeffersonville",
  "sims",
  "mount erie",
  "mt erie",
  "golden gate",
  "barnhill",
  "mill shoals",
  "burnt prairie",
  "albion",
  "grayville",
  "browns",
  "west salem",
  "bone gap",
  "elléry",
  "ellery",
  "carmi",
  "enfield",
  "springerton",
  "crossville",
  "flora",
  "clay city",
  "sailor springs",
  "xenia",
  "louisville",
  "mcleansboro",
  "dahlgren",
  "bluford",
  "keenes",
  "olney",
  "noble",
  "parkersburg",
  "calhoun",
  "mt vernon",
  "mount vernon",
];

function getChicagoTodayIso() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Chicago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const y = parts.find((p) => p.type === "year")?.value;
  const m = parts.find((p) => p.type === "month")?.value;
  const d = parts.find((p) => p.type === "day")?.value;
  return `${y}-${m}-${d}`;
}

function normalizeIsoDate(rawDate, fallbackDisplayDate) {
  const s = String(rawDate || "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y, m, d] = s.split("-").map(Number);
    const utc = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
    if (
      utc.getUTCFullYear() === y &&
      utc.getUTCMonth() === m - 1 &&
      utc.getUTCDate() === d
    ) {
      return { iso: s, dayOfWeek: utc.getUTCDay() };
    }
    return null;
  }

  // Fallback if client sent display label e.g. "Tue, Nov 19"
  const fb = String(fallbackDisplayDate || s).trim();
  if (!fb) return null;
  const todayIso = getChicagoTodayIso();
  const [curYear] = todayIso.split("-").map(Number);
  for (const yearCandidate of [curYear, curYear + 1]) {
    const parsed = new Date(`${fb}, ${yearCandidate} 12:00:00 UTC`);
    if (!Number.isNaN(parsed.getTime())) {
      const iso = `${parsed.getUTCFullYear()}-${String(parsed.getUTCMonth() + 1).padStart(2, "0")}-${String(parsed.getUTCDate()).padStart(2, "0")}`;
      if (iso >= todayIso) {
        return { iso, dayOfWeek: parsed.getUTCDay() };
      }
    }
  }
  return null;
}

function isWithinFairfieldServiceArea(addressText, cityText, stateText, zipText) {
  const combined = `${addressText || ""} ${cityText || ""} ${stateText || ""} ${zipText || ""}`.toLowerCase();
  const state = String(stateText || "").trim().toUpperCase();
  if (state && state !== "IL" && state !== "ILLINOIS") return false;

  const zipMatch = String(zipText || combined).match(/\b(\d{5})(?:-\d{4})?\b/);
  if (zipMatch) {
    const zip = zipMatch[1];
    // 628xx covers Fairfield (62837) & surrounding Southern IL counties; 629xx & 62450 cover adjacent ~25mi border towns
    if (zip.startsWith("628") || zip.startsWith("629") || zip === "62450") {
      return true;
    }
    return false;
  }

  return LOCAL_TOWNS.some((town) => combined.includes(town));
}

export default async function handler(req, res) {
  applyCors(
    req,
    res,
    "POST,OPTIONS",
    "Authorization, Content-Type, X-Requested-With, Accept",
  );

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST, OPTIONS");
    return res.status(405).json({
      error: `Method ${req.method} Not Allowed. Please send a POST request.`,
    });
  }

  const sbUrl = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "").replace(/\/$/, "");
  const sbServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!sbUrl || !sbServiceKey) {
    console.error("create-booking: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing.");
    return res.status(503).json({
      error: "Online booking is temporarily unavailable. Please call 618-204-1497.",
    });
  }

  try {
    const booking = req.body || {};

    const name = String(booking.name || booking.customer_name || "").trim();
    const email = String(booking.email || booking.customer_email || "").trim().toLowerCase();
    const phone = String(booking.phone || booking.customer_phone || "").trim();
    const phoneDigits = phone.replace(/\D/g, "");
    const service = String(booking.service || "").trim();
    const rawIso = booking.date_iso || booking.appt_date || booking.date || "";
    const rawDisplayDate = booking.date || booking.appt_date || "";
    const apptTime = String(booking.time || booking.appt_time || "").trim();
    const visitType =
      (booking.visit_type || booking.visitType || "in-store") === "home"
        ? "home"
        : "in-store";

    if (!name || !service || !rawIso || !apptTime) {
      return res.status(400).json({
        error: "Missing required booking fields (name, service, date, and time are required).",
      });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: "A valid email address is required." });
    }
    if (phoneDigits.length < 7) {
      return res.status(400).json({ error: "A valid phone number is required." });
    }

    const parsedDate = normalizeIsoDate(rawIso, rawDisplayDate);
    if (!parsedDate) {
      return res.status(400).json({ error: "Please select a valid appointment date (YYYY-MM-DD)." });
    }

    const todayChicago = getChicagoTodayIso();
    if (parsedDate.iso < todayChicago) {
      return res.status(400).json({ error: "Please pick an appointment date today or in the future." });
    }
    if (parsedDate.dayOfWeek === 0) {
      return res.status(400).json({ error: "The shop is closed on Sundays. Please pick Monday through Saturday." });
    }

    const allowedSlots = parsedDate.dayOfWeek === 6 ? SATURDAY_SLOTS : WEEKDAY_SLOTS;
    if (!allowedSlots.has(apptTime)) {
      return res.status(400).json({
        error:
          parsedDate.dayOfWeek === 6
            ? "Saturday appointments are available between 10:00 AM and 3:00 PM."
            : "Weekday appointments are available between 9:00 AM and 5:00 PM.",
      });
    }

    const homeAddress = String(booking.home_address || booking.homeAddress || "").trim();
    const homeCity = String(booking.homeCity || booking.home_city || "").trim();
    const homeState = String(booking.homeState || booking.home_state || "").trim();
    const homeZip = String(booking.homeZip || booking.home_zip || "").trim();

    if (visitType === "home") {
      if (!homeAddress) {
        return res.status(400).json({ error: "A street address is required for a Home Visit." });
      }
      if (!isWithinFairfieldServiceArea(homeAddress, homeCity, homeState, homeZip)) {
        return res.status(400).json({
          error: "Home visits are available within ~25 miles of Fairfield, IL (628xx/629xx area). Please choose an in-store visit or call 618-204-1497.",
        });
      }
    }

    const sbHeaders = {
      apikey: sbServiceKey,
      Authorization: `Bearer ${sbServiceKey}`,
    };

    // Verify slot availability so two customers don't double-book the exact same slot
    const slotQuery = `${sbUrl}/rest/v1/bookings?select=id,status&appt_date=eq.${encodeURIComponent(parsedDate.iso)}&appt_time=eq.${encodeURIComponent(apptTime)}&limit=5`;
    const slotRes = await fetch(slotQuery, { headers: sbHeaders });
    if (slotRes.ok) {
      const existingAtSlot = await slotRes.json().catch(() => []);
      const activeConflicts = (existingAtSlot || []).filter(
        (row) => row.status !== "cancelled" && row.status !== "no-show",
      );
      if (activeConflicts.length > 0) {
        return res.status(409).json({
          error: "That appointment time was just booked. Please pick another time slot.",
        });
      }
    }

    // Tie booking to signed-in customer account (best-effort)
    const { userId } = await resolveUserIdFromAuth(req);

    const payload = {
      customer_name: name.slice(0, 120),
      customer_email: email.slice(0, 320),
      customer_phone: phone.slice(0, 40),
      service: service.slice(0, 200),
      device_type: String(booking.deviceType || booking.device_type || "").slice(0, 120),
      device_model: String(booking.deviceModel || booking.device_model || "").slice(0, 120),
      issue: String(booking.issue || "").slice(0, 1000),
      appt_date: parsedDate.iso,
      appt_time: apptTime,
      notes: String(booking.notes || "").slice(0, 1000),
      visit_type: visitType,
      visit_location_type:
        visitType === "home"
          ? booking.visit_location_type || booking.visitLocationType || "residential"
          : null,
      home_address: visitType === "home" ? homeAddress.slice(0, 400) : "",
      status: "pending",
      ...(userId ? { user_id: userId } : {}),
    };

    const dbResponse = await fetch(`${sbUrl}/rest/v1/bookings`, {
      method: "POST",
      headers: {
        ...sbHeaders,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify(payload),
    });

    if (!dbResponse.ok) {
      const errorData = await dbResponse.json().catch(() => ({}));
      console.error("Supabase booking insert error:", errorData);
      return res.status(dbResponse.status === 400 ? 400 : 500).json({
        error: errorData.message || "Failed to persist booking in database.",
      });
    }

    const created = await dbResponse.json().catch(() => [payload]);
    const saved = created[0] || payload;
    return res.status(200).json({
      ok: true,
      bookingId: saved.id,
      booking: saved,
    });
  } catch (error) {
    console.error("Booking API error:", error);
    return res.status(500).json({
      error: error.message || "Internal server error creating booking.",
    });
  }
}
