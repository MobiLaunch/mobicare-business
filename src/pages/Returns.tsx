import { Link } from "react-router-dom";
import { Repeat } from "lucide-react";

import PolicyShell, { Glance } from "@/components/policy/PolicyShell";
import { BUSINESS } from "@/lib/config";

export default function Returns() {
  return (
    <PolicyShell
      color="orange"
      eyebrow="Returns & Exchanges"
      glance={
        <Glance
          items={[
            { ok: false, text: <><strong>No returns</strong> for buyer&rsquo;s remorse or change of mind.</> },
            { ok: true, text: <><strong>Exchanges</strong> are available if your item is <strong>defective</strong>.</> },
            { ok: true, text: "The item must be in like-new condition, with its original packaging and all included accessories." },
            { ok: false, text: <>We <strong>do not offer refunds</strong>. See our <Link className="underline" to="/refunds">Refund policy</Link>.</> },
          ]}
        />
      }
      icon={Repeat}
      lead="All sales are final. If something you bought from us turns out to be defective, we'll exchange it."
      metaDescription="Mobicare's returns and exchange policy: no returns for buyer's remorse; defective items may be exchanged when in like-new condition with original packaging and accessories."
      path="/returns"
      sections={[
        {
          id: "final-sale",
          title: "All sales are final",
          body: (
            <>
              <p>We do not accept returns for buyer&rsquo;s remorse. That includes changing your mind, ordering the wrong item or model, or no longer needing the item.</p>
              <p>Please check the product details, your device&rsquo;s model and compatibility before you buy. If you&rsquo;re not sure, call or message us first &mdash; we&rsquo;re happy to help you pick the right one.</p>
            </>
          ),
        },
        {
          id: "exchanges",
          title: "Exchanges for defective items",
          body: (
            <>
              <p>If an item you bought from us is <strong>defective</strong>, we will exchange it. To qualify, all of the following must be true:</p>
              <ul>
                <li>The item is genuinely defective &mdash; it doesn&rsquo;t work as it should when used normally.</li>
                <li>The item is in <strong>like-new condition</strong>.</li>
                <li>The item comes back in its <strong>original packaging</strong>.</li>
                <li>All <strong>included accessories</strong> (cables, adapters, inserts, manuals and anything else that came in the box) are returned with it.</li>
              </ul>
              <p>Exchanges are for the same item, subject to availability. If we don&rsquo;t have it in stock, we&rsquo;ll contact you about the next step. Exchanges are not refunds &mdash; no money is returned.</p>
            </>
          ),
        },
        {
          id: "not-eligible",
          title: "What isn’t eligible",
          body: (
            <>
              <ul>
                <li>Buyer&rsquo;s remorse, change of mind, or an item ordered by mistake.</li>
                <li>Items that aren&rsquo;t in like-new condition, or are missing the original packaging or any included accessories.</li>
                <li>Damage that happened after delivery &mdash; for example drops, liquid, bending, burns or modification. That&rsquo;s wear and misuse, not a defect.</li>
              </ul>
              <p>We decide eligibility after inspecting the item.</p>
            </>
          ),
        },
        {
          id: "how-to",
          title: "How to request an exchange",
          body: (
            <>
              <ol>
                <li>Contact us as soon as you notice the problem &mdash; call <a href={`tel:${BUSINESS.phone.replace(/[^0-9+]/g, "")}`}>{BUSINESS.phone}</a> or email <a href={`mailto:${BUSINESS.email}`}>{BUSINESS.email}</a>.</li>
                <li>Give us your order number and a short description of what&rsquo;s wrong. Photos or a short video help.</li>
                <li>Keep the item, its packaging and all accessories together until we&rsquo;ve confirmed next steps.</li>
                <li>We&rsquo;ll inspect the item. If it qualifies, we&rsquo;ll arrange your exchange and tell you how to get the item to us.</li>
              </ol>
              <p>Local customers can also bring the item and packaging to our Fairfield shop during business hours.</p>
            </>
          ),
        },
        {
          id: "repairs",
          title: "Repairs",
          body: (
            <>
              <p>Repair services are separate from product sales. Every part we install is covered by our <strong>90-day parts warranty</strong>: if the part fails within 90 days, we&rsquo;ll replace it at no charge. Labor for unrelated issues isn&rsquo;t covered. See the <Link to="/repairs">Repairs page</Link> for details.</p>
            </>
          ),
        },
      ]}
      title="Returns & Exchanges"
    />
  );
}
