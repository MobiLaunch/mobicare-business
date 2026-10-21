import { CalendarCheck, ShieldCheck, Zap } from "lucide-react";

import AppIcon, { type IconColor } from "@/components/ios/AppIcon";
import Reveal from "@/components/ios/Reveal";

const STEPS: Array<{ n: number; title: string; body: string; icon: typeof Zap; color: IconColor }> = [
  { n: 1, title: "Tell us what's wrong", body: "Book online in about a minute, or just walk in. $35 flat bench fee covers a full diagnostic.", icon: CalendarCheck, color: "blue" },
  { n: 2, title: "Fixed fast", body: "Most screens and batteries are done the same day — often in 1–2 hours.", icon: Zap, color: "orange" },
  { n: 3, title: "Backed for 90 days", body: "Every part we install carries a 90-day warranty. No surprises, quote before we start.", icon: ShieldCheck, color: "green" },
];

export default function HowItWorks() {
  return (
    <section className="py-6" id="how-it-works-section">
      <Reveal className="mb-5 px-1">
        <p className="type-eyebrow m-0">How it works</p>
        <h2 className="ios-section-title">Three taps to a fixed phone</h2>
        <div className="ios-rainbow mt-2 w-24" />
      </Reveal>

      <ol className="m-0 grid list-none gap-4 p-0 md:grid-cols-3">
        {STEPS.map((s, i) => (
          <li key={s.n}>
            <Reveal className="h-full" delay={i * 110}>
              <article className="ios-card-gloss surface-raised lift flex h-full items-start gap-4 rounded-panel p-5">
                <AppIcon color={s.color} icon={s.icon} size={56} />
                <div>
                  <h3 className="m-0 text-lg font-extrabold text-[var(--ios-ink)]">
                    <span className="mr-1.5 text-[var(--ios-blue)]">{s.n}.</span>
                    {s.title}
                  </h3>
                  <p className="m-0 mt-1 text-sm leading-relaxed text-muted">{s.body}</p>
                </div>
              </article>
            </Reveal>
          </li>
        ))}
      </ol>
    </section>
  );
}
