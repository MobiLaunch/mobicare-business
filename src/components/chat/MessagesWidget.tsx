import { useCallback, useEffect, useRef, useState } from "react";
import { Phone, Send, X } from "lucide-react";

import RealIcon from "@/components/ios/RealIcons";
import BookingWizard from "@/components/LazyBookingWizard";
import { useNavigate } from "react-router-dom";
import { BUSINESS } from "@/lib/config";
import { QUICK_REPLIES, getReply, type BotContext, type ChatAction } from "@/lib/chatbot";
import { play } from "@/lib/sound";
import { useSiteStore } from "@/lib/siteStore";

interface Msg {
  id: number;
  from: "me" | "them";
  text: string;
  action?: ChatAction;
}

const NUDGE_KEY = "mobicare:chat-nudged";
const GREETING: Omit<Msg, "id">[] = [
  { from: "them", text: "Hi! 👋 I'm the Mobicare assistant. Cracked screen? Dead battery? Ask me about prices, hours or booking." },
];

function timeLabel() {
  return `Today ${new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
}

/**
 * iMessage-style chat. A scripted assistant (see lib/chatbot.ts) answers the
 * common pre-sale questions instantly and hands off to a booking flow or a
 * real phone call/text for everything else.
 */
export default function MessagesWidget() {
  const navigate = useNavigate();
  const business = useSiteStore((s) => s.business);
  const repairServices = useSiteStore((s) => s.repairServices);

  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(1);
  const [nudge, setNudge] = useState(false);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [typing, setTyping] = useState(false);
  const [draft, setDraft] = useState("");
  const [stamp] = useState(timeLabel);
  const [messages, setMessages] = useState<Msg[]>([]);
  const idRef = useRef(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const timers = useRef<number[]>([]);
  const greeted = useRef(false);

  const phone = business?.phone || BUSINESS.phone;
  const ctx: BotContext = {
    repairServices,
    hours: business?.hours?.length ? business.hours : BUSINESS.hours,
    phone,
    city: business?.city || BUSINESS.city,
  };

  const later = (fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  };

  useEffect(() => {
    const pending = timers.current;

    return () => pending.forEach((t) => window.clearTimeout(t));
  }, []);

  // One gentle nudge per session, long after the page has settled.
  useEffect(() => {
    let seen = false;

    try {
      seen = sessionStorage.getItem(NUDGE_KEY) === "1";
    } catch {
      /* ignore */
    }
    if (seen) return;

    const id = window.setTimeout(() => {
      setNudge(true);
      play("receive");
      try {
        sessionStorage.setItem(NUDGE_KEY, "1");
      } catch {
        /* ignore */
      }
    }, 14_000);
    const hide = window.setTimeout(() => setNudge(false), 24_000);

    return () => {
      window.clearTimeout(id);
      window.clearTimeout(hide);
    };
  }, []);

  const push = useCallback((m: Omit<Msg, "id">) => {
    setMessages((prev) => [...prev, { ...m, id: ++idRef.current }]);
  }, []);

  const reply = useCallback(
    (replies: ReturnType<typeof getReply>) => {
      let delay = 500;

      replies.forEach((r) => {
        const typingFor = Math.min(1500, 450 + r.text.length * 14);

        later(() => setTyping(true), delay);
        delay += typingFor;
        later(() => {
          setTyping(false);
          push({ from: "them", text: r.text, action: r.action });
          play("receive");
        }, delay);
        delay += 250;
      });
    },
    [push],
  );

  // Greeting appears the first time the sheet opens.
  useEffect(() => {
    if (!open || greeted.current) return;
    greeted.current = true;
    reply(GREETING.map((g) => ({ text: g.text })));
  }, [open, reply]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, typing]);

  useEffect(() => {
    if (!open) return;

    inputRef.current?.focus({ preventScroll: true });

    // On phones the sheet is full-screen: stop the page scrolling behind it.
    const prevOverflow = document.body.style.overflow;

    if (window.matchMedia("(max-width: 639px)").matches) document.body.style.overflow = "hidden";

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };

    document.addEventListener("keydown", onKey);

    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const send = (raw: string) => {
    const text = raw.trim();

    if (!text) return;
    push({ from: "me", text });
    play("send");
    setDraft("");
    reply(getReply(text, ctx));
  };

  const runAction = (a: ChatAction) => {
    if (a.kind === "book") setBookingOpen(true);
    else if (a.kind === "link") {
      if (/^https?:/.test(a.to)) window.open(a.to, "_blank", "noopener,noreferrer");
      else {
        setOpen(false);
        navigate(a.to);
      }
    }
  };

  const digits = phone.replace(/[^0-9+]/g, "");
  const lastMine = [...messages].reverse().find((m) => m.from === "me")?.id;
  const answered = lastMine !== undefined && messages.some((m) => m.from === "them" && m.id > lastMine);

  const openSheet = () => {
    setOpen(true);
    setUnread(0);
    setNudge(false);
    play("tap");
  };

  return (
    <>
      {/* Launcher */}
      {!open && (
        <div className="fixed bottom-[calc(var(--ios-tab-h)+14px)] right-4 z-[55] flex flex-col items-end gap-2 lg:bottom-6 lg:right-6">
          {nudge && (
            <button
              className="msg msg--them !max-w-[220px] cursor-pointer text-left"
              style={{ transformOrigin: "100% 100%" }}
              type="button"
              onClick={openSheet}
            >
              Need a quote? Ask me — I reply instantly 👋
            </button>
          )}
          <button
            aria-label={`Open chat${unread ? ", 1 unread message" : ""}`}
            className={`msgs-launcher ${nudge ? "is-nudging" : ""} rounded-[22.5%] shadow-[0_6px_16px_rgba(0,0,0,0.45)] transition-transform active:scale-90`}
            type="button"
            onClick={openSheet}
          >
            <RealIcon badge={unread || undefined} name="messages" plain size={60} />
          </button>
        </div>
      )}

      {/* Sheet */}
      {open && (
        <div
          aria-label="Chat with Mobicare"
          className="fixed inset-x-0 bottom-0 top-0 z-[90] flex flex-col overflow-hidden bg-white sm:inset-auto sm:bottom-6 sm:right-6 sm:h-[600px] sm:max-h-[calc(100vh-3rem)] sm:w-[380px] sm:rounded-[14px] sm:border sm:border-[#2f4a75] sm:shadow-[0_18px_60px_rgba(0,0,0,0.55)]"
          role="dialog"
          style={{ animation: "ios-push 0.3s var(--ios-ease) both" }}
        >
          <div className="ios-navbar flex h-11 shrink-0 items-center justify-between px-2">
            <button className="ios-bar-btn" type="button" onClick={() => setOpen(false)}>
              <X aria-hidden="true" className="size-3.5" /> Close
            </button>
            <div className="text-center leading-tight">
              <div className="ios-navbar-title text-[15px]">Mobicare</div>
              <div className="text-[10px] font-bold text-white/80" style={{ textShadow: "0 -1px 0 rgba(0,0,0,.4)" }}>
                Auto-reply · real humans by call/text
              </div>
            </div>
            <a aria-label={`Call ${phone}`} className="ios-bar-btn ios-bar-btn--done" href={`tel:${digits}`}>
              <Phone aria-hidden="true" className="size-3.5" /> Call
            </a>
          </div>

          <div ref={scrollRef} aria-live="polite" className="msgs-bg flex flex-1 flex-col gap-2 overflow-y-auto px-2 py-3" role="log">
            <p className="m-0 text-center text-[11px] font-bold text-[#6b7487]" style={{ textShadow: "0 1px 0 #fff" }}>
              {stamp}
            </p>

            {messages.map((m) => (
              <div key={m.id} className={`flex flex-col gap-1.5 ${m.from === "me" ? "items-end" : "items-start"}`}>
                <div className={`msg msg--${m.from}`}>{m.text}</div>
                {m.action && (
                  <div className="ml-2" style={{ animation: "ios-pop 0.35s var(--ios-ease) 0.15s both" }}>
                    {m.action.kind === "tel" ? (
                      <a className="ios-btn ios-btn--green ios-btn--sm" href={`tel:${digits}`}>
                        <Phone aria-hidden="true" className="size-4" /> {m.action.label}
                      </a>
                    ) : m.action.kind === "sms" ? (
                      <a className="ios-btn ios-btn--green ios-btn--sm" href={`sms:${digits}`}>
                        {m.action.label}
                      </a>
                    ) : (
                      <button className="ios-btn ios-btn--green ios-btn--sm" type="button" onClick={() => runAction(m.action!)}>
                        {m.action.label}
                      </button>
                    )}
                  </div>
                )}
                {m.id === lastMine && (
                  <span className="mr-3 text-[11px] font-bold text-[#6b7487]" style={{ textShadow: "0 1px 0 #fff" }}>
                    {answered ? "Read" : "Delivered"}
                  </span>
                )}
              </div>
            ))}

            {typing && (
              <div className="msg msg--them !py-3" aria-label="Mobicare is typing">
                <span className="typing-dot" />
                <span className="typing-dot" style={{ animationDelay: "0.18s" }} />
                <span className="typing-dot" style={{ animationDelay: "0.36s" }} />
              </div>
            )}

            {messages.length > 0 && !typing && (
              <div className="mt-2 flex flex-wrap justify-end gap-1.5">
                {QUICK_REPLIES.map((q) => (
                  <button key={q} className="ios-btn ios-btn--white ios-btn--sm !rounded-full" type="button" onClick={() => send(q)}>
                    {q}
                  </button>
                ))}
              </div>
            )}
          </div>

          <form
            className="msgs-input flex shrink-0 items-center gap-2 px-2 py-2"
            style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
            onSubmit={(e) => {
              e.preventDefault();
              send(draft);
            }}
          >
            <input
              ref={inputRef}
              aria-label="Message"
              autoComplete="off"
              className="msgs-field"
              placeholder="Message"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
            />
            <button aria-label="Send" className="ios-btn ios-btn--sm !min-h-8 !rounded-full" data-silent disabled={!draft.trim()} type="submit">
              <Send aria-hidden="true" className="size-3.5" /> Send
            </button>
          </form>
        </div>
      )}

      {bookingOpen && <BookingWizard onClose={() => setBookingOpen(false)} />}
    </>
  );
}
