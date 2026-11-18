import { Suspense, lazy, type ComponentProps } from "react";

const BookingWizard = lazy(() => import("@/components/BookingWizard"));

/** Booking flow pulls in EmailJS and a lot of UI; load it only when opened. */
export default function LazyBookingWizard(props: ComponentProps<typeof BookingWizard>) {
  return (
    <Suspense fallback={null}>
      <BookingWizard {...props} />
    </Suspense>
  );
}
