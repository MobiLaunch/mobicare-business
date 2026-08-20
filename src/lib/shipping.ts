import {
  addDays,
  format,
  isSunday,
  isSaturday,
  setHours,
  setMinutes,
} from "date-fns";

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
 * Daily order cutoff is 2:00 PM CST (Mon-Sat, Sun closed).
 */
export function getDispatchCutoff(now: Date = new Date()) {
  const currentDay = now.getDay();
  const currentHour = now.getHours();

  // Sunday = 0
  const isSundayToday = currentDay === 0;
  const isPastCutoff = currentHour >= 14; // 2:00 PM cutoff

  if (isSundayToday || isPastCutoff) {
    // Next dispatch is next business day at 2:00 PM
    const nextDispatchDate = isSundayToday
      ? addDays(now, 1)
      : addDays(now, isSaturday(now) ? 2 : 1);
    const targetTime = setMinutes(setHours(nextDispatchDate, 14), 0);
    const diffMs = Math.max(0, targetTime.getTime() - now.getTime());
    const totalHours = Math.floor(diffMs / (1000 * 60 * 60));
    const totalMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    return {
      isToday: false,
      hours: totalHours,
      minutes: totalMinutes,
      formatted: `${totalHours}h ${totalMinutes}m`,
      text: "Order now for dispatch tomorrow",
    };
  }

  const todayCutoff = setMinutes(setHours(now, 14), 0);
  const diffMs = Math.max(0, todayCutoff.getTime() - now.getTime());
  const hoursLeft = Math.floor(diffMs / (1000 * 60 * 60));
  const minutesLeft = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  return {
    isToday: true,
    hours: hoursLeft,
    minutes: minutesLeft,
    formatted: `${hoursLeft}h ${minutesLeft}m`,
    text: `Order within ${hoursLeft}h ${minutesLeft}m for same-day dispatch`,
  };
}

/**
 * Returns dynamic arrival window for given min/max business days from now.
 */
export function getEstimatedArrivalWindow(
  minDays: number = 3,
  maxDays: number = 5,
  fromDate: Date = new Date(),
) {
  const cutoff = getDispatchCutoff(fromDate);
  const dispatchDate = cutoff.isToday
    ? fromDate
    : addDays(fromDate, isSunday(fromDate) ? 1 : 1);

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

  // Local Pickup
  const isShopOpenToday = !isSunday(fromDate);
  const pickupText = isShopOpenToday
    ? "Ready today in ~1 hour"
    : "Ready Monday at 10:00 AM";

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
      shortArrival: "Store Pickup",
      description: "Pick up at our Fairfield, IL shop (Mon–Sat)",
      badge: "Local",
      minDays: 0,
      maxDays: 0,
    },
  ];
}
