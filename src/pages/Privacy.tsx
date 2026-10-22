import { Link } from "react-router-dom";

import PolicyShell, { Glance } from "@/components/policy/PolicyShell";
import { BUSINESS } from "@/lib/config";

export default function Privacy() {
  return (
    <PolicyShell
      glance={
        <Glance
          items={[
            { ok: true, text: "We collect only what we need to fix your device, fill your order and run your account." },
            { ok: true, text: <>Card payments are handled by <strong>Stripe</strong>. We never see or store your full card number.</> },
            { ok: false, text: <><strong>We don&rsquo;t sell</strong> your personal information.</> },
            { ok: false, text: "We don't run advertising trackers on this site." },
          ]}
        />
      }
      lead="What Mobicare collects, why, who helps us handle it, and the choices you have."
      metaDescription="Mobicare's privacy policy: what personal information we collect for repairs, orders and accounts, how it is used and shared, and how to contact us."
      path="/privacy"
      sections={[
        {
          id: "collect",
          title: "What we collect",
          body: (
            <>
              <ul>
                <li><strong>Account details</strong>, your name, email address, phone number and password (stored securely by our authentication provider) if you create an account.</li>
                <li><strong>Repair bookings</strong>, your name, phone, email, the service and device you&rsquo;re booking, a description of the issue, your chosen appointment time and, for home visits, your service address.</li>
                <li><strong>Orders</strong>, your name, email, phone (optional), delivery address, the items you buy and order totals.</li>
                <li><strong>Messages</strong>, anything you send us through the chat in your account, by email or by phone.</li>
                <li><strong>Payment information</strong>, you enter your card details into a form provided by Stripe. We receive the result of the payment and a payment reference, not your card number.</li>
                <li><strong>Technical data</strong>, like most websites, our hosting and service providers may receive your IP address, browser type and device information when you visit.</li>
              </ul>
              <p>Repair devices may contain personal data. We only access what is needed to diagnose and fix the device, and we ask you to back up and remove anything sensitive beforehand where possible.</p>
            </>
          ),
        },
        {
          id: "use",
          title: "How we use it",
          body: (
            <>
              <ul>
                <li>To book, perform and follow up on repairs.</li>
                <li>To process, ship and support your orders, including exchanges of defective items.</li>
                <li>To run your account, show your order and booking history, and answer your messages.</li>
                <li>To send transactional emails such as booking and order confirmations.</li>
                <li>To keep the site secure, prevent fraud and meet legal, tax and accounting obligations.</li>
              </ul>
              <p>We don&rsquo;t sell your personal information, and we don&rsquo;t use it for third-party advertising.</p>
            </>
          ),
        },
        {
          id: "share",
          title: "Who we share it with",
          body: (
            <>
              <p>We use a small number of service providers to run the site. They only receive what they need to do their job:</p>
              <ul>
                <li><strong>Supabase</strong>, hosts our database and account sign-in.</li>
                <li><strong>Stripe</strong>, processes card payments.</li>
                <li><strong>EmailJS</strong>, delivers booking and order notification emails.</li>
                <li><strong>Vercel</strong>, hosts the website and the secure order and payment functions.</li>
                <li><strong>Google Maps</strong>, displays the map of our shop when it&rsquo;s enabled. Google may receive technical data from your browser when the map loads.</li>
                <li><strong>Shipping carriers</strong>, receive your name, address and phone number to deliver your order.</li>
              </ul>
              <p>We may also disclose information if the law requires it, or to protect our rights, our customers or the public.</p>
            </>
          ),
        },
        {
          id: "storage",
          title: "Cookies & browser storage",
          body: (
            <>
              <p>We use your browser&rsquo;s local storage and similar technology only for things the site needs:</p>
              <ul>
                <li>keeping you signed in to your account;</li>
                <li>remembering the items in your cart;</li>
                <li>remembering your sound on/off choice, and that you&rsquo;ve already seen the intro or chat prompt this session.</li>
              </ul>
              <p>Stripe may also set its own cookies to help detect fraud when you check out. You can clear or block site data in your browser settings; some features, like staying signed in or keeping a cart, may stop working.</p>
              <p>We don&rsquo;t currently run advertising or cross-site tracking. If that changes, we&rsquo;ll update this page.</p>
            </>
          ),
        },
        {
          id: "retention",
          title: "How long we keep it",
          body: (
            <>
              <p>We keep personal information for as long as we need it to provide repairs, orders and support, to honor warranties and exchanges, and to meet legal, tax and accounting requirements. After that, we delete it or remove what identifies you.</p>
            </>
          ),
        },
        {
          id: "security",
          title: "Security",
          body: (
            <>
              <p>We use reputable providers, encrypted connections (HTTPS) and access controls to protect your information. No method of transmission or storage is perfectly secure, so we can&rsquo;t guarantee absolute security. Please use a strong, unique password for your account.</p>
            </>
          ),
        },
        {
          id: "choices",
          title: "Your choices",
          body: (
            <>
              <ul>
                <li>You can view and update your name and phone number in your <Link to="/account">account</Link>.</li>
                <li>You can ask us for a copy of the personal information we hold about you, ask us to correct it, or ask us to delete it. We&rsquo;ll act on reasonable requests, though we may need to keep some records, such as order records, where the law requires.</li>
                <li>You can ask us to stop sending non-essential messages.</li>
              </ul>
              <p>To make a request, email <a href={`mailto:${BUSINESS.email}`}>{BUSINESS.email}</a> or call <a href={`tel:${BUSINESS.phone.replace(/[^0-9+]/g, "")}`}>{BUSINESS.phone}</a>. We may need to verify your identity first.</p>
            </>
          ),
        },
        {
          id: "children",
          title: "Children",
          body: (
            <>
              <p>Our website and store are intended for adults. We don&rsquo;t knowingly collect personal information from children under 13. If you believe a child has given us personal information, contact us and we&rsquo;ll delete it.</p>
            </>
          ),
        },
        {
          id: "changes",
          title: "Changes to this policy",
          body: (
            <>
              <p>We may update this policy from time to time. The &ldquo;last updated&rdquo; date at the top shows when it last changed. If we make significant changes, we&rsquo;ll make that clear on the site.</p>
            </>
          ),
        },
      ]}
      title="Privacy policy"
    />
  );
}
