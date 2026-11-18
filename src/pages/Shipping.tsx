import { Link } from "react-router-dom";

import PolicyShell, { Glance } from "@/components/policy/PolicyShell";
import { getDispatchCutoff, getDynamicShippingOptions } from "@/lib/shipping";
import { useSiteStore } from "@/lib/siteStore";
import { BUSINESS } from "@/lib/config";

const FREE_SHIPPING_MIN = 35;

export default function Shipping() {
  const business = useSiteStore((s) => s.business);
  const hours = business?.hours?.length ? business.hours : BUSINESS.hours;
  // Same source of truth as checkout, so this page can't drift from the prices customers pay.
  const options = getDynamicShippingOptions(0);
  const cutoff = getDispatchCutoff();

  return (
    <PolicyShell
      glance={
        <Glance
          items={[
            { ok: true, text: <>Free standard shipping on orders of <strong>${FREE_SHIPPING_MIN}+</strong>.</> },
            { ok: true, text: <>Orders placed by <strong>2:00 PM</strong> (Mon–Sat) ship the same day. <em>{cutoff.text}.</em></> },
            { ok: true, text: "Free local pickup at our Fairfield, IL shop." },
            { ok: false, text: "We currently ship within the United States only." },
          ]}
        />
      }
      lead="How and when your order gets to you, what it costs, and what to do if something goes wrong."
      metaDescription="Mobicare shipping policy: standard and express delivery, free shipping on orders $35+, same-day dispatch before 2 PM, and free local pickup in Fairfield, IL."
      path="/shipping"
      sections={[
        {
          id: "options",
          title: "Delivery options & rates",
          body: (
            <>
              <table>
                <thead>
                  <tr><th>Option</th><th>Cost</th><th>Typical delivery</th></tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>{options[0].name}</strong><br />USPS / UPS Ground, tracked</td>
                    <td>${(5.99).toFixed(2)}<br /><span style={{ color: "var(--success)" }}><strong>FREE</strong> on ${FREE_SHIPPING_MIN}+</span></td>
                    <td>{options[0].minDays}–{options[0].maxDays} business days</td>
                  </tr>
                  <tr>
                    <td><strong>{options[1].name}</strong><br />Expedited</td>
                    <td>{options[1].formattedCost}</td>
                    <td>{options[1].minDays}–{options[1].maxDays} business days</td>
                  </tr>
                  <tr>
                    <td><strong>{options[2].name}</strong><br />Mon–Sat</td>
                    <td><strong>FREE</strong></td>
                    <td>Usually ready in about an hour during open hours</td>
                  </tr>
                </tbody>
              </table>
              <p>Your exact options, prices and estimated arrival dates are shown at checkout before you pay. Tax is calculated at checkout.</p>
            </>
          ),
        },
        {
          id: "processing",
          title: "Processing & dispatch",
          body: (
            <>
              <p>Orders placed before <strong>2:00 PM</strong>, Monday through Saturday, are dispatched the same day. Orders placed after the cutoff, or on Sunday, are dispatched the next business day.</p>
              <p>Carriers don&rsquo;t deliver on Sundays, so we don&rsquo;t count Sundays in delivery estimates. Estimated arrival dates are estimates, not guarantees, carriers can run late, especially around holidays and bad weather.</p>
            </>
          ),
        },
        {
          id: "pickup",
          title: "Local pickup",
          body: (
            <>
              <p>Choose <strong>Fairfield Store Pickup</strong> at checkout to collect your order from our shop at no charge.</p>
              <ul>
                {hours.map((h) => (
                  <li key={h.days}><strong>{h.days}:</strong> {h.hours}</li>
                ))}
              </ul>
              <p>Bring your order number or the confirmation email, and a photo ID.</p>
            </>
          ),
        },
        {
          id: "address",
          title: "Delivery addresses",
          body: (
            <>
              <p>We ship to addresses in the United States. Please double-check your address before you pay, we ship to exactly what you enter at checkout, and we can&rsquo;t be responsible for packages sent to an incorrect address.</p>
              <p>If you need to correct an address, contact us right away. We&rsquo;ll do our best to fix it before the order ships.</p>
            </>
          ),
        },
        {
          id: "problems",
          title: "Delayed, lost or damaged packages",
          body: (
            <>
              <p>Every standard and express shipment is tracked. If your tracking hasn&rsquo;t moved in several days, or your package arrives damaged or incomplete, contact us right away with your order number and, for damage, photos of the box and the item.</p>
              <p>Items that arrive defective are handled under our <Link to="/returns">Returns and exchanges</Link> policy. As described on our <Link to="/refunds">Refund policy</Link>, we do not offer refunds.</p>
            </>
          ),
        },
      ]}
      title="Shipping policy"
    />
  );
}
