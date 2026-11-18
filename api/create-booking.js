import { applyCors, resolveBearerUserId } from "./_order-pricing.js";

// Vercel Serverless Function: /api/create-booking
// Validates business hours, slot concurrency, and Southern Illinois house-call
// service radius before persisting bookings to Supabase via service_role.

const SHOP_PHONE = "618-204-1497";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ISO_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

// Southern Illinois communities within ~25 miles of Fairfield, IL (62837)
const LOCAL_TOWNS = [
  "fairfield",
  "cisne",
  "wayne city",
  "geff",
  "johnsonville",
  "sims",
  "barnhill",
  "mount erie",
  "mt erie",
  "mt. erie",
  "golden gate",
  "mill shoals",
  "burnt prairie",
  "springerton",
  "enfield",
  "norris city",
  "carmi",
  "grayville",
  "albion",
  "browns",
  "bone gap",
  "west salem",
  "olney",
  "clay city",
  "flora",
  "louisville",
  "xenia",
  "rinard",
  "keenes",
  "bluford",
  "belle rive",
  "opdyke",
  "mount vernon",
  "mt vernon",
  "mt. vernon",
  "dahlgren",
  "mcleansboro",
  "crossville",
];

function getChicagoNowParts(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);

  const get = (type) => parts.find((p) => p.type === type)?.value || "00";
  const year = get("year");
  const month = get("month");
  const day = get("day");
  const hour = Number(get("hour"));
  const minute = Number(get("minute"));

  return {
    todayIso: `${year}-${month}-${day}`,
    minutesNow: hour * 60 + minute,
  };
}

function parseIsoDate(dateStr) {
  const match = ISO_DATE_RE.exec(String(dateStr || "").trim());
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const utc = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));

  if (
    utc.getUTCFullYear() !== year ||
    utc.getUTCMonth() + 1 !== month ||
    utc.getUTCDate() !== day
  ) {
    return null;
  }

  return {
    iso: `${match[1]}-${match[2]}-${match[3]}`,
    dayOfWeek: utc.getUTCDay(), // 0 = Sunday .. 6 = Saturday
  };
}

function parseAppointmentTime(rawTime) {
  const trimmed = String(rawTime || "").trim();
  if (!trimmed) return null;

  // 12-hour format: "9:00 AM", "12:30 PM", "2 PM"
  const match12 = /^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/i.exec(trimmed);
  if (match12) {
    let hour12 = Number(match12[1]);
    const minute = Number(match12[2] || "0");
    const period = match12[3].toUpperCase();

    if (hour12 < 1 || hour12 > 12 || minute < 0 || minute > 59) return null;

    let hour24 = hour12 % 12;
    if (period === "PM") hour24 += 12;

    return {
      minutes: hour24 * 60 + minute,
      normalized: `${hour12}:${String(minute).padStart(2, "0")} ${period}`,
    };
  }

  // 24-hour format fallback: "09:00", "14:30"
  const match24 = /^(\d{1,2}):(\d{2})$/.exec(trimmed);
  if (match24) {
    const hour24 = Number(match24[1]);
    const minute = Number(match24[2]);
    if (hour24 < 0 || hour24 > 23 || minute < 0 || minute > 59) return null;

    const period = hour24 >= 12 ? "PM" : "AM";
    const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
    return {
      minutes: hour24 * 60 + minute,
      normalized: `${hour12}:${String(minute).padStart(2, "0")} ${period}`,
    };
  }

  return null;
}

function isWithinFairfieldServiceArea({ homeAddress, homeCity, homeState, homeZip }) {
  const combined = [homeAddress, homeCity, homeState, homeZip]
    .filter(Boolean)
    .join(" ")
    .trim();
  if (!combined) return false;

  // Reject explicit out-of-state addresses (only Illinois is in the 25-mile Fairfield radius)
  const explicitState = String(homeState || "").trim().toUpperCase();
  if (explicitState && explicitState !== "IL" && explicitState !== "ILLINOIS") {
    return false;
  }

  const zipCandidate =
    String(homeZip || "").trim() ||
    (/\b(\d{5})(?:-\d{4})?\b/.exec(combined)?.[1] ?? "");

  if (zipCandidate) {
    const zip5 = zipCandidate.replace(/\D/g, "").slice(0, 5);
    if (zip5.length === 5) {
      return zip5.startsWith("628") || zip5.startsWith("629");
    }
  }

  // If no 5-digit ZIP was included in home_address, verify a local Southern IL town
  const lower = combined.toLowerCase();
  const mentionsNonIlState = /\b,\s*(in|ky|mo|ia|wi|tn|ca|tx|ny|fl)\b/i.test(combined);
  if (mentionsNonIlState) return false;

  return LOCAL_TOWNS.some((town) => lower.includes(town));
}

export default async function handler(req, res) {
  applyCors(req, res, {
    methods: "POST,OPTIONS",
    headers:
      "Authorization, Content-Type, X-Requested-With, Accept, Idempotency-Key",
  });

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST, OPTIONS");
    return res.status(405).json({
      error: `Method ${req.method} Not Allowed. Please send a POST request.`,
    });
  }

  const rawSbUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
  const sbUrl = rawSbUrl.replace(/\/$/, "");
  const sbServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

  if (!sbUrl || !sbServiceKey) {
    console.error("create-booking: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing.");
    return res.status(503).json({
      error: `Online booking is temporarily unavailable due to server configuration (SUPABASE_SERVICE_ROLE_KEY required). Please call us at ${SHOP_PHONE} to schedule your appointment.`,
    });
  }

  try {
    const booking = req.body || {};

    const name = String(booking.name || booking.customer_name || "").trim();
    const email = String(booking.email || booking.customer_email || "")
      .trim()
      .toLowerCase();
    const phone = String(booking.phone || booking.customer_phone || "").trim();
    const service = String(booking.service || "").trim();
    const rawDate = String(booking.appt_date || booking.date || "").trim();
    const rawTime = String(booking.appt_time || booking.time || "").trim();

    if (!name || !service || !rawDate || !rawTime) {
      return res.status(400).json({
        error:
          "Missing required booking fields (name, service, date, and time are required).",
      });
    }
    if (!EMAIL_RE.test(email)) {
      return res.status(400).json({ error: "A valid email address is required." });
    }
    if (phone.replace(/\D/g, "").length < 7) {
      return res.status(400).json({ error: "A valid phone number is required." });
    }

    // Validate ISO YYYY-MM-DD date in America/Chicago timezone
    const parsedDate = parseIsoDate(rawDate);
    if (!parsedDate) {
      return res.status(400).json({
        error: "Appointment date must be a valid ISO date (YYYY-MM-DD).",
      });
    }

    const { todayIso, minutesNow } = getChicagoNowParts();
    if (parsedDate.iso < todayIso) {
      return res.status(400).json({
        error: "Appointment date cannot be in the past. Please choose an upcoming date.",
      });
    }
    if (parsedDate.dayOfWeek === 0) {
      return res.status(400).json({
        error: "Our shop is closed on Sundays. Please choose a Monday through Saturday date.",
      });
    }

    // Validate appointment time against weekday (9 AM - 5 PM) vs Saturday (10 AM - 3 PM) hours
    const parsedTime = parseAppointmentTime(rawTime);
    if (!parsedTime) {
      return res.status(400).json({
        error: "Please select a valid appointment time (for example, 10:00 AM).",
      });
    }

    const isSaturday = parsedDate.dayOfWeek === 6;
    const openMinutes = isSaturday ? 10 * 60 : 9 * 60; // 10:00 AM Sat, 9:00 AM Mon-Fri
    const closeMinutes = isSaturday ? 15 * 60 : 17 * 60; // 3:00 PM Sat, 5:00 PM Mon-Fri

    if (parsedTime.minutes < openMinutes || parsedTime.minutes > closeMinutes) {
      return res.status(400).json({
        error: isSaturday
          ? "Saturday appointments are available between 10:00 AM and 3:00 PM."
          : "Weekday appointments are available between 9:00 AM and 5:00 PM.",
      });
    }

    if (parsedDate.iso === todayIso && parsedTime.minutes < minutesNow) {
      return res.status(400).json({
        error: "That time slot has already passed for today. Please pick a later time.",
      });
    }

    const visitType = String(
      booking.visit_type || booking.visitType || "in-store",
    )
      .trim()
      .toLowerCase();

    if (visitType !== "in-store" && visitType !== "home") {
      return res.status(400).json({
        error: 'Invalid visit_type. Expected "in-store" or "home".',
      });
    }

    const rawHomeStreet = String(booking.homeAddress || "").trim();
    const homeCity = String(booking.homeCity || booking.home_city || "").trim();
    const homeState = String(booking.homeState || booking.home_state || "").trim();
    const homeZip = String(booking.homeZip || booking.home_zip || "").trim();

    let homeAddress = String(booking.home_address || "").trim();
    if (!homeAddress && rawHomeStreet) {
      homeAddress = [
        rawHomeStreet,
        homeCity,
        [homeState, homeZip].filter(Boolean).join(" "),
      ]
        .filter(Boolean)
        .join(", ");
    }

    if (visitType === "home") {
      if (!homeAddress) {
        return res.status(400).json({
          error: "A service address is required for home visits.",
        });
      }

      if (
        !isWithinFairfieldServiceArea({
          homeAddress,
          homeCity,
          homeState,
          homeZip,
        })
      ) {
        return res.status(400).json({
          error: `Home visits are available within ~25 miles of Fairfield, IL (ZIP codes 628xx / 629xx). For locations outside our 25-mile service area, please call us at ${SHOP_PHONE} or schedule an in-store visit.`,
        });
      }
    }

    const sbConfig = { url: sbUrl, key: sbServiceKey };

    // Attach user_id if a valid Authorization: Bearer <token> was provided
    const { userId } = await resolveBearerUserId(req, sbConfig, { strict: false });

    // Check active bookings (pending or confirmed) on the same date + time slot
    const slotQuery = `${sbUrl}/rest/v1/bookings?select=id,visit_type,appt_time,status&appt_date=eq.${encodeURIComponent(parsedDate.iso)}&status=in.(pending,confirmed)`;
    const slotResponse = await fetch(slotQuery, {
      headers: {
        apikey: sbServiceKey,
        Authorization: `Bearer ${sbServiceKey}`,
      },
    });

    if (!slotResponse.ok) {
      console.error("Supabase slot check failed:", slotResponse.status);
      return res.status(502).json({
        error: "Unable to verify appointment availability. Please try again.",
      });
    }

    const sameDayBookings = (await slotResponse.json().catch(() => [])) || [];
    const sameSlotBookings = sameDayBookings.filter((row) => {
      const existingParsed = parseAppointmentTime(row.appt_time);
      return existingParsed
        ? existingParsed.minutes === parsedTime.minutes
        : String(row.appt_time || "").trim().toLowerCase() ===
            parsedTime.normalized.toLowerCase();
    });

    const activeHomeCalls = sameSlotBookings.filter(
      (row) => String(row.visit_type || "").toLowerCase() === "home",
    ).length;
    const activeTotal = sameSlotBookings.length;

    if (visitType === "home" && activeHomeCalls >= 1) {
      return res.status(409).json({
        error:
          "That house-call time slot is already reserved. Please select another time.",
      });
    }

    if (activeTotal >= 2) {
      return res.status(409).json({
        error:
          "That appointment time slot is full. Please select another available time.",
      });
    }

    const rawLocationType = String(
      booking.visit_location_type || booking.visitLocationType || "",
    )
      .trim()
      .toLowerCase();
    const visitLocationType =
      visitType === "home" &&
      (rawLocationType === "residential" || rawLocationType === "commercial")
        ? rawLocationType
        : null;

    const payload = {
      customer_name: name.slice(0, 200),
      customer_email: email.slice(0, 320),
      customer_phone: phone.slice(0, 40),
      service: service.slice(0, 200),
      device_type: String(booking.deviceType || booking.device_type || "")
        .trim()
        .slice(0, 120),
      device_model: String(booking.deviceModel || booking.device_model || "")
        .trim()
        .slice(0, 160),
      issue: String(booking.issue || "").trim().slice(0, 1000),
      appt_date: parsedDate.iso,
      appt_time: parsedTime.normalized,
      notes: String(booking.notes || "").trim().slice(0, 1000),
      visit_type: visitType,
      visit_location_type: visitLocationType,
      home_address: visitType === "home" ? homeAddress.slice(0, 500) : "",
      status: "pending",
      ...(userId ? { user_id: userId } : {}),
    };

    const dbResponse = await fetch(`${sbUrl}/rest/v1/bookings`, {
      method: "POST",
      headers: {
        apikey: sbServiceKey,
        Authorization: `Bearer ${sbServiceKey}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify(payload),
    });

    if (!dbResponse.ok) {
      const errorData = await dbResponse.json().catch(() => ({}));
      const msg = String(errorData?.message || "");
      if (msg.toLowerCase().includes("please wait before submitting")) {
        return res.status(429).json({
          error: "Please wait 30 seconds before submitting another booking.",
        });
      }
      console.error("Supabase booking insert error:", errorData);
      return res.status(500).json({
        error: "Failed to persist booking in database.",
      });
    }

    const created = await dbResponse.json().catch(() => [payload]);
    return res.status(201).json({
      ok: true,
      booking: created[0] || payload,
    });
  } catch (error) {
    console.error("Booking API error:", error);
    return res.status(500).json({
      error: error.message || "Internal server error creating booking.",
    });
  }
}
