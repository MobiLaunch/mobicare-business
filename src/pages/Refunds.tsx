import { Link } from "react-router-dom";
import { CircleDollarSign } from "lucide-react";

import PolicyShell, { Glance } from "@/components/policy/PolicyShell";

export default function Refunds() {
  return (
    <PolicyShell
      color="green"
      eyebrow="Refund Policy"
      glance={
        <Glance
          items={[
            { ok: false, text: <>We <strong>do not offer refunds</strong> on products or services.</> },
            { ok: true, text: <>Defective products can be <strong>exchanged</strong> &mdash; see <Link className="underline" to="/returns">Returns &amp; Exchanges</Link>.</> },
            { ok: true, text: "Repair parts are covered by our 90-day parts warranty (replacement at no charge)." },
          ]}
        />
      }
      icon={CircleDollarSign}
      lead="We don't offer refunds. Here's what we do instead, and the few situations where a payment is reversed."
      metaDescription="Mobicare's refund policy: we do not offer refunds. Defective products may be exchanged; repair parts carry a 90-day warranty."
      path="/refunds"
      sections={[
        {
          id: "no-refunds",
          title: "No refunds",
          body: (
            <>
              <p>Mobicare does not offer refunds on products or services. All sales are final, including accessories bought from our shop and online store.</p>
              <p>Because we don&rsquo;t take returns for buyer&rsquo;s remorse, please make sure an item is right for you before you buy. Questions beforehand are always welcome.</p>
            </>
          ),
        },
        {
          id: "exchanges",
          title: "Exchanges for defective items",
          body: (
            <>
              <p>If a product is defective, we&rsquo;ll exchange it rather than refund it, provided it&rsquo;s in like-new condition with its original packaging and all included accessories. Full details are on our <Link to="/returns">Returns &amp; Exchanges</Link> page.</p>
            </>
          ),
        },
        {
          id: "repairs",
          title: "Repair services",
          body: (
            <>
              <p>Repair labor and the $35 bench (diagnostic) fee are not refundable. If a part we installed fails within 90 days under normal use, we&rsquo;ll replace that part at no charge.</p>
            </>
          ),
        },
        {
          id: "unfulfilled",
          title: "If we can’t fill your order",
          body: (
            <>
              <p>If we&rsquo;re unable to fulfil an online order &mdash; for example, an item turns out to be out of stock after you&rsquo;ve paid &mdash; we&rsquo;ll let you know and cancel that order. A payment for goods we never ship is reversed to your original payment method.</p>
              <p>Your bank decides how long a reversal takes to appear, which is usually a few business days.</p>
            </>
          ),
        },
        {
          id: "disputes",
          title: "Problems with an order",
          body: (
            <>
              <p>If something is wrong with your order, please contact us before you contact your bank or card issuer. Most problems can be sorted out quickly with a call or an email, and a defective item can be exchanged.</p>
            </>
          ),
        },
      ]}
      title="Refund Policy"
    />
  );
}
