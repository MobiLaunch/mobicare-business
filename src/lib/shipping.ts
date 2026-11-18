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

const SHOP_TIME_ZONE = "America/Chicago";

/**
 * Extracts calendar and wall-clock parts in Fairfield, IL (`America/Chicago`),
 * plus a UTC-noon Date representing that Chicago calendar date so date-fns
 * day arithmetic (`addDays`, `format`, `isSunday`) always reflects shop-local days.
 */
function getChicagoClock(now: Date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: SHOP_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);

  const num = (type: string) =>
    Number(parts.find((p) => p.type === type)?.value || 0);
  const year = num("year");
  const month = num("month");
  const day = num("day");
  const rawHour = num("hour");
  const hour = rawHour === 24 ? 0 : rawHour;
  const minute = num("minute");

  // Local noon anchor avoids DST midnight edge cases when adding days
  const calendarDate = new Date(year, month - 1, day, 12, 0, 0);
  const dayOfWeek = calendarDate.getDay(); // 0 = Sun ... 6 = Sat

  return {
    year,
    month,
    day,
    hour,
    minute,
    dayOfWeek,
    calendarDate,
    minutesSinceMidnight: hour * 60 + minute,
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
    // Carriers (USPS/UPS) operate Mon-Sat; skip Sunday
    if (!isSunday(currentDate)) {
      daysAdded++;
    }
  }

  return currentDate;
}

/**
 * Returns whether orders placed right now qualify for same-day processing dispatch.
 * Daily order cutoff is 2:00 PM CT (Mon-Sat, Sun closed) in America/Chicago.
 */
export function getDispatchCutoff(now: Date = new Date()) {
  const ct = getChicagoClock(now);
  const cutoffMinutes = 14 * 60; // 2:00 PM CT
  const isSundayToday = ct.dayOfWeek === 0;
  const isPastCutoff = ct.minutesSinceMidnight >= cutoffMinutes;

  if (isSundayToday || isPastCutoff) {
    // Next dispatch is Monday if today is Saturday (past 2 PM) or Sunday; otherwise tomorrow
    const daysUntilNextDispatch = isSundayToday
      ? 1
      : ct.dayOfWeek === 6
        ? 2
        : 1;
    const totalMinutesUntil =
      daysUntilNextDispatch * 24 * 60 -
      ct.minutesSinceMidnight +
      cutoffMinutes;
    const totalHours = Math.floor(totalMinutesUntil / 60);
    const totalMinutes = totalMinutesUntil % 60;
    const nextLabel =
      !isSundayToday && ct.dayOfWeek === 6
        ? "Order now for Monday dispatch"
        : "Order now for dispatch tomorrow";

    return {
      isToday: false,
      hours: totalHours,
      minutes: totalMinutes,
      formatted: `${totalHours}h ${totalMinutes}m`,
      text: nextLabel,
    };
  }

  const remainingMinutes = Math.max(0, cutoffMinutes - ct.minutesSinceMidnight);
  const hoursLeft = Math.floor(remainingMinutes / 60);
  const minutesLeft = remainingMinutes % 60;

  return {
    isToday: true,
    hours: hoursLeft,
    minutes: minutesLeft,
    formatted: `${hoursLeft}h ${minutesLeft}m`,
    text: `Order within ${hoursLeft}h ${minutesLeft}m for same-day dispatch`,
  };
}

/**
 * Returns dynamic arrival window for given min/max business days from now (America/Chicago).
 */
export function getEstimatedArrivalWindow(
  minDays: number = 3,
  maxDays: number = 5,
  fromDate: Date = new Date(),
) {
  const ct = getChicagoClock(fromDate);
  const cutoff = getDispatchCutoff(fromDate);
  let dispatchDate = ct.calendarDate;

  if (!cutoff.isToday) {
    dispatchDate = addDays(ct.calendarDate, 1);
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

function getFairfieldPickupEstimate(fromDate: Date): string {
  const ct = getChicagoClock(fromDate);
  // Fairfield shop hours: Mon–Fri 9:00 AM – 6:00 PM CT (same-day ~1h pickup cutoff 5:00 PM),
  // Saturday 10:00 AM – 4:00 PM CT (same-day ~1h pickup cutoff 3:00 PM), Sunday Closed.
  const isSaturdayToday = ct.dayOfWeek === 6;
  const isSundayToday = ct.dayOfWeek === 0;

  if (!isSundayToday) {
    const openMin = isSaturdayToday ? 10 * 60 : 9 * 60;
    const lastPickupOrderMin = isSaturdayToday ? 15 * 60 : 17 * 60;
    const openLabel = isSaturdayToday ? "10:00 AM" : "9:00 AM";

    if (ct.minutesSinceMidnight < openMin) {
      return `Ready today after ${openLabel}`;
    }
    if (ct.minutesSinceMidnight <= lastPickupOrderMin) {
      return "Ready today in ~1 hour";
    }
  }

  let nextOpen = addDays(ct.calendarDate, 1);

  while (isSunday(nextOpen)) {
    nextOpen = addDays(nextOpen, 1);
  }
  const nextOpenLabel = nextOpen.getDay() === 6 ? "10:00 AM" : "9:00 AM";

  return `Ready ${format(nextOpen, "EEEE")} after ${nextOpenLabel}`;
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
  const pickupText = getFairfieldPickupEstimate(fromDate);

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
      estimatedArrival: pickupText,
      shortArrival: pickupText,
      description: "Pick up at 920 Commerce Drive, Suite 3, Fairfield, IL (Mon–Sat)",
      badge: "Local",
      minDays: 0,
      maxDays: 0,
    },
  ];
}
