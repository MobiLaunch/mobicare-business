import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import * as Dialog from "@radix-ui/react-dialog";
import { ArrowUpRight, CalendarDays, CircleUser, Phone, X } from "lucide-react";
import { NavLink } from "react-router-dom";

import { BUSINESS } from "@/lib/config";
import { useSiteStore } from "@/lib/siteStore";

export interface MenuLink { to: string; label: string; hint: string; end?: boolean }

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  links: MenuLink[];
  accountTo: string;
  signedIn: boolean;
  onBook: () => void;
}

const SPRING = { type: "spring", stiffness: 380, damping: 40, mass: 0.9 } as const;

/** Slide-over site menu: blurred scrim, spring panel, staggered links with hover and press feedback. */
export default function MenuPanel({ open, onOpenChange, links, accountTo, signedIn, onBook }: Props) {
  const reduce = useReducedMotion();
  const business = useSiteStore((s) => s.business);
  const phone = business?.phone || BUSINESS.phone;
  const close = () => onOpenChange(false);
  const enter = (i: number) => (reduce ? { duration: 0 } : { ...SPRING, delay: 0.12 + i * 0.045 });

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild forceMount>
              <motion.div className="mc-menu-scrim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: reduce ? 0 : 0.22 }} />
            </Dialog.Overlay>
            <Dialog.Content asChild forceMount aria-describedby={undefined}>
              <motion.aside
                className="mc-menu"
                initial={reduce ? { opacity: 0 } : { x: "104%" }}
                animate={reduce ? { opacity: 1 } : { x: 0 }}
                exit={reduce ? { opacity: 0 } : { x: "104%", transition: { duration: 0.24, ease: [0.4, 0, 1, 1] } }}
                transition={reduce ? { duration: 0 } : SPRING}
              >
                <div className="mc-menu-top">
                  <Dialog.Title className="mc-menu-title">Menu</Dialog.Title>
                  <Dialog.Close asChild>
                    <button aria-label="Close menu" className="mc-iconbtn" type="button">
                      <X aria-hidden="true" size={18} strokeWidth={1.75} />
                    </button>
                  </Dialog.Close>
                </div>

                <nav aria-label="Site" className="mc-menu-links">
                  {links.map((l, i) => (
                    <motion.div key={l.to} initial={{ opacity: 0, x: reduce ? 0 : 28 }} animate={{ opacity: 1, x: 0 }} transition={enter(i)}>
                      <NavLink className="mc-menu-link" end={l.end} to={l.to} onClick={close}>
                        <span className="mc-menu-idx">{String(i + 1).padStart(2, "0")}</span>
                        <span className="mc-menu-label">{l.label}<small>{l.hint}</small></span>
                        <ArrowUpRight aria-hidden="true" className="mc-menu-arrow" size={20} strokeWidth={1.75} />
                      </NavLink>
                    </motion.div>
                  ))}
                </nav>

                <motion.div className="mc-menu-foot" initial={{ opacity: 0, y: reduce ? 0 : 16 }} animate={{ opacity: 1, y: 0 }} transition={enter(links.length)}>
                  <button className="mc-cta" type="button" onClick={() => { close(); onBook(); }}>
                    <CalendarDays aria-hidden="true" size={18} strokeWidth={1.75} />
                    Book a repair
                  </button>
                  <div className="mc-menu-meta">
                    <NavLink className="mc-menu-chip" to={accountTo} onClick={close}>
                      <CircleUser aria-hidden="true" size={16} strokeWidth={1.75} />
                      {signedIn ? "My account" : "Sign in"}
                    </NavLink>
                    <a className="mc-menu-chip" href={`tel:${phone.replace(/[^0-9+]/g, "")}`}>
                      <Phone aria-hidden="true" size={16} strokeWidth={1.75} />
                      {phone}
                    </a>
                  </div>
                </motion.div>
              </motion.aside>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}
