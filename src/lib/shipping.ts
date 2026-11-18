import { addDays, format, isSunday } from "date-fns";

export interface ShippingOption {
  id: "standard" | "express" | "pickup";
  name: string;
  cost: number;
  formattedCost: string;
  estimatedArrival: string;
  shortArrival: string;
  description: string;
  badge?: string;
  minDays: number;
  maxDays: number;
}

const SHOP_TIMEZONE = "America/Chicago";

const WEEKDAY_MAP: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

const DAY_NAMES_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAY_NAMES_FULL = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

/**
 * Extracts calendar components in America/Chicago (CST/CDT) regardless of
 * what timezone the visitor's browser is set to.
 */
export function getChicagoParts(date: Date = new Date()) {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: SHOP_TIMEZONE,
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const parts = dtf.formatToParts(date);
  const get = (type: string) =>
    parts.find((p) => p.type === type)?.value || "0";

  const weekdayStr = get("weekday");
  const dayOfWeek = WEEKDAY_MAP[weekdayStr] ?? 0;
  const year = parseInt(get("year"), 10);
  const month = parseInt(get("month"), 10); // 1-12
  const day = parseInt(get("day"), 10);
  const rawHour = parseInt(get("hour"), 10);
  const hour = rawHour === 24 ? 0 : rawHour;
  const minute = parseInt(get("minute"), 10);

  return {
    dayOfWeek,
    year,
    month,
    day,
    hour,
    minute,
    minutesOfDay: hour * 60 + minute,
    localAnchorDate: new Date(year, month - 1, day, 12, 0, 0),
  };
}

/**
 * Shop hours in Fairfield, IL (America/Chicago):
 * Mon–Fri: 9:00 AM – 6:00 PM (540 .. 1080)
 * Saturday: 10:00 AM – 4:00 PM (600 .. 960)
 * Sunday: Closed
 */
function getOpenCloseMinutes(dayOfWeek: number): {
  open: number;
  close: number;
  openLabel: string;
} | null {
  if (dayOfWeek === 0) return null; // Sunday closed
  if (dayOfWeek === 6) {
    return { open: 10 * 60, close: 16 * 60, openLabel: "10 AM" };
  }
  return { open: 9 * 60, close: 18 * 60, openLabel: "9 AM" };
}

export function getShopOpenStatus(now: Date = new Date()): {
  isOpen: boolean;
  canReadyToday: boolean;
  badgeText: string;
  pickupText: string;
} {
  const chi = getChicagoParts(now);
  const todaySchedule = getOpenCloseMinutes(chi.dayOfWeek);

  if (
    todaySchedule &&
    chi.minutesOfDay >= todaySchedule.open &&
    chi.minutesOfDay < todaySchedule.close
  ) {
    // Require at least 45 minutes before closing to promise ~1 hour pickup today
    const canReadyToday = chi.minutesOfDay <= todaySchedule.close - 45;
    if (canReadyToday) {
      return {
        isOpen: true,
        canReadyToday: true,
        badgeText: "● Open Now · Fairfield, IL",
        pickupText: "Ready today in ~1 hour",
      };
    }
  }

  // If before opening time today on a business day:
  if (todaySchedule && chi.minutesOfDay < todaySchedule.open) {
    return {
      isOpen: false,
      canReadyToday: true,
      badgeText: `Closed · Opens Today ${todaySchedule.openLabel}`,
      pickupText: `Ready today after ${todaySchedule.openLabel}`,
    };
  }

  // Otherwise find next open day (Mon–Sat)
  for (let offset = 1; offset <= 7; offset++) {
    const nextDow = (chi.dayOfWeek + offset) % 7;
    const sched = getOpenCloseMinutes(nextDow);
    if (sched) {
      const dayShort = DAY_NAMES_SHORT[nextDow];
      const dayFull = offset === 1 ? "tomorrow" : DAY_NAMES_FULL[nextDow];
      return {
        isOpen: false,
        canReadyToday: false,
        badgeText: `Closed · Opens ${dayShort} ${sched.openLabel}`,
        pickupText: `Ready ${dayFull} at ${sched.openLabel}`,
      };
    }
  }

  return {
    isOpen: false,
    canReadyToday: false,
    badgeText: "Closed · Opens Mon 9 AM",
    pickupText: "Ready Monday at 9 AM",
  };
}

/**
 * Calculates delivery date by adding transit days, skipping Sundays.
 */
export function calculateTransitDate(
  startDate: Date,
  transitDays: number,
): Date {
  let currentDate = new Date(startDate);
  let daysAdded = 0;

  while (daysAdded < transitDays) {
    currentDate = addDays(currentDate, 1);
    if (!isSunday(currentDate)) {
      daysAdded++;
    }
  }

  return currentDate;
}

/**
 * Returns whether orders placed right now qualify for same-day processing dispatch.
 * Daily order cutoff is 2:00 PM CST/CDT (Mon–Sat, Sun closed).
 */
export function getDispatchCutoff(now: Date = new Date()) {
  const chi = getChicagoParts(now);
  const cutoffMinutes = 14 * 60; // 2:00 PM America/Chicago
  const isSundayToday = chi.dayOfWeek === 0;
  const isPastCutoff = chi.minutesOfDay >= cutoffMinutes;

  if (isSundayToday || isPastCutoff) {
    // Days until next Mon–Sat 2:00 PM CST/CDT
    let daysUntilNext = 1;
    if (!isSundayToday && chi.dayOfWeek === 6) {
      daysUntilNext = 2; // Saturday after 2 PM -> Monday 2 PM
    }
    const minutesUntilMidnight = 24 * 60 - chi.minutesOfDay;
    const totalMinutesUntilNext =
      minutesUntilMidnight + (daysUntilNext - 1) * 24 * 60 + cutoffMinutes;
    const totalHours = Math.floor(totalMinutesUntilNext / 60);
    const remMinutes = totalMinutesUntilNext % 60;

    const nextDayWord =
      isSundayToday || chi.dayOfWeek === 6 ? "Monday" : "tomorrow";

    return {
      isToday: false,
      hours: totalHours,
      minutes: remMinutes,
      formatted: `${totalHours}h ${remMinutes}m`,
      text: `Order now for dispatch ${nextDayWord} (2 PM CT cutoff)`,
    };
  }

  const minsLeft = Math.max(0, cutoffMinutes - chi.minutesOfDay);
  const hoursLeft = Math.floor(minsLeft / 60);
  const minutesLeft = minsLeft % 60;

  return {
    isToday: true,
    hours: hoursLeft,
    minutes: minutesLeft,
    formatted: `${hoursLeft}h ${minutesLeft}m`,
    text: `Order within ${hoursLeft}h ${minutesLeft}m for same-day dispatch`,
  };
}

/**
 * Returns dynamic arrival window for given min/max business days from now (in CST/CDT).
 */
export function getEstimatedArrivalWindow(
  minDays: number = 3,
  maxDays: number = 5,
  fromDate: Date = new Date(),
) {
  const chi = getChicagoParts(fromDate);
  const cutoff = getDispatchCutoff(fromDate);
  let dispatchDate = chi.localAnchorDate;

  if (!cutoff.isToday) {
    dispatchDate = addDays(dispatchDate, 1);
    while (isSunday(dispatchDate)) {
      dispatchDate = addDays(dispatchDate, 1);
    }
  }

  const minDate = calculateTransitDate(dispatchDate, minDays);
  const maxDate = calculateTransitDate(dispatchDate, maxDays);

  const minFormatted = format(minDate, "EEE, MMM d");
  const maxFormatted = format(maxDate, "EEE, MMM d");
  const shortMin = format(minDate, "MMM d");
  const shortMax = format(maxDate, "MMM d");

  return {
    minDate,
    maxDate,
    formatted:
      minFormatted === maxFormatted
        ? minFormatted
        : `${minFormatted} – ${maxFormatted}`,
    shortFormatted:
      shortMin === shortMax ? shortMin : `${shortMin} – ${shortMax}`,
  };
}

/**
 * Returns available shipping options computed dynamically for a given subtotal.
 */
export function getDynamicShippingOptions(
  subtotal: number,
  baseMinDays: number = 3,
  baseMaxDays: number = 5,
  fromDate: Date = new Date(),
): ShippingOption[] {
  const standardFree = subtotal >= 35;
  const standardCost = standardFree ? 0 : 5.99;
  const standardArrival = getEstimatedArrivalWindow(
    baseMinDays,
    baseMaxDays,
    fromDate,
  );
  const expressArrival = getEstimatedArrivalWindow(1, 2, fromDate);
  const shopStatus = getShopOpenStatus(fromDate);

  return [
    {
      id: "standard",
      name: "Standard Shipping",
      cost: standardCost,
      formattedCost:
        standardCost === 0 ? "FREE" : `$${standardCost.toFixed(2)}`,
      estimatedArrival: standardArrival.formatted,
      shortArrival: standardArrival.shortFormatted,
      description: standardFree
        ? "Free Standard tracked delivery on orders $35+"
        : "Standard USPS/UPS Ground tracked delivery",
      badge: standardFree ? "Free Eligible" : undefined,
      minDays: baseMinDays,
      maxDays: baseMaxDays,
    },
    {
      id: "express",
      name: "Priority Express",
      cost: 12.99,
      formattedCost: "$12.99",
      estimatedArrival: expressArrival.formatted,
      shortArrival: expressArrival.shortFormatted,
      description: "Fast expedited 1–2 business day delivery",
      badge: "Fastest",
      minDays: 1,
      maxDays: 2,
    },
    {
      id: "pickup",
      name: "Fairfield Store Pickup",
      cost: 0,
      formattedCost: "FREE",
      estimatedArrival: shopStatus.pickupText,
      shortArrival: "Store Pickup",
      description: `920 Commerce Dr, Suite 3, Fairfield, IL · ${shopStatus.pickupText}`,
      badge: "Local",
      minDays: 0,
      maxDays: 0,
    },
  ];
}
