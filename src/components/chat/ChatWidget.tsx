import { Suspense, lazy, useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MessageCircle, Phone, X } from "lucide-react";

import { Button } from "@/components/arc/button/button";
import { ChatComposer, ChatThread, type ChatDraft, type ChatMessage } from "@/components/arc/chat-thread/chat-thread";
import { BUSINESS } from "@/lib/config";
import { QUICK_REPLIES, getReply, type BotContext, type ChatAction } from "@/lib/chatbot";
import { useSiteStore } from "@/lib/siteStore";

const BookingWizard = lazy(() => import("@/components/BookingWizard"));

const SHOP = { id: "shop", name: "Mobicare" };
const ME = { id: "me", name: "You" };
const GREETING = "Hi, I'm the Mobicare assistant. Ask me about prices, hours, shipping or booking. For anything else, a person can help by call or text.";

/**
 * Chat panel. A scripted assistant (see lib/chatbot.ts) answers the common
 * pre-sale questions instantly and hands off to booking or to a real phone
 * call or text. It is not a live agent and not an LLM, and says so.
 */
export default function ChatWidget() {
  const navigate = useNavigate();
  const business = useSiteStore((s) => s.business);
  const repairServices = useSiteStore((s) => s.repairServices);
  const [open, setOpen] = useState(false);
  const [booking, setBooking] = useState(false);
  const [typing, setTyping] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [actions, setActions] = useState<ChatAction[]>([]);
  const counter = useRef(0);
  const timers = useRef<number[]>([]);
  const greeted = useRef(false);

  const phone = business?.phone || BUSINESS.phone;
  const digits = phone.replace(/[^0-9+]/g, "");
  const ctx: BotContext = {
    repairServices,
    hours: business?.hours?.length ? business.hours : BUSINESS.hours,
    phone,
    city: business?.city || BUSINESS.city,
  };

  const later = (fn: () => void, ms: number) => { timers.current.push(window.setTimeout(fn, ms)); };

  useEffect(() => {
    const pending = timers.current;

    return () => pending.forEach((t) => window.clearTimeout(t));
  }, []);

  const push = useCallback((authorId: string, text: string, status?: ChatMessage["status"]) => {
    setMessages((prev) => [...prev, { id: `m${++counter.current}`, authorId, text, createdAt: new Date(), status }]);
  }, []);

  const reply = useCallback((replies: ReturnType<typeof getReply>) => {
    let delay = 450;

    replies.forEach((r) => {
      const typingFor = Math.min(1400, 400 + r.text.length * 12);

      later(() => setTyping(true), delay);
      delay += typingFor;
      later(() => {
        setTyping(false);
        push(SHOP.id, r.text);
        if (r.action) setActions((a) => [...a.filter((x) => x.kind !== r.action!.kind || x.label !== r.action!.label), r.action!]);
      }, delay);
      delay += 200;
    });
  }, [push]);

  useEffect(() => {
    if (!open || greeted.current) return;
    greeted.current = true;
    reply([{ text: GREETING }]);
  }, [open, reply]);

  const send = (text: string) => {
    const t = text.trim();

    if (!t) return;
    setActions([]);
    push(ME.id, t, "delivered");
    reply(getReply(t, ctx));
  };

  const runAction = (a: ChatAction) => {
    if (a.kind === "book") setBooking(true);
    else if (a.kind === "link") {
      if (/^https?:/.test(a.to)) window.open(a.to, "_blank", "noopener,noreferrer");
      else { setOpen(false); navigate(a.to); }
    }
  };

  useEffect(() => {
    if (!open) return;

    const prev = document.body.style.overflow;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };

    if (window.matchMedia("(max-width: 639px)").matches) document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);

    return () => { document.body.style.overflow = prev; document.removeEventListener("keydown", onKey); };
  }, [open]);

  return (
    <>
      {!open && (
        <div className="mc-chat-fab">
          <Button aria-label="Open chat" size="lg" onClick={() => setOpen(true)}>
            <MessageCircle aria-hidden="true" size={18} strokeWidth={1.75} />
            Chat
          </Button>
        </div>
      )}

      {open && (
        <div aria-label="Chat with Mobicare" className="mc-chat-panel" role="dialog">
          <div className="mc-chat-head">
            <div>
              <strong className="mc-strong" style={{ display: "block" }}>Mobicare</strong>
              <span className="mc-small">Automatic replies. People answer calls and texts.</span>
            </div>
            <a aria-label={`Call ${phone}`} href={`tel:${digits}`} style={{ textDecoration: "none" }}><Button size="sm" tabIndex={-1} variant="secondary"><Phone aria-hidden="true" size={16} strokeWidth={1.75} />Call</Button></a>
            <Button aria-label="Close chat" size="sm" variant="ghost" onClick={() => setOpen(false)}><X aria-hidden="true" size={16} strokeWidth={1.75} /></Button>
          </div>

          <div className="mc-chat-body">
            <ChatThread
              allowAttachments={false}
              composer={false}
              currentUserId={ME.id}
              label="Conversation with Mobicare"
              messages={messages}
              participants={[SHOP, ME]}
              typing={typing ? [SHOP.id] : []}
            />
          </div>

          <div className="mc-chat-quick">
            {actions.map((a) => (
              a.kind === "tel" ? <a key={a.label} href={`tel:${digits}`} style={{ textDecoration: "none" }}><Button tabIndex={-1}>{a.label}</Button></a>
              : a.kind === "sms" ? <a key={a.label} href={`sms:${digits}`} style={{ textDecoration: "none" }}><Button tabIndex={-1}>{a.label}</Button></a>
              : <Button key={a.label} onClick={() => runAction(a)}>{a.label}</Button>
            ))}
            {QUICK_REPLIES.map((q) => (
              <Button key={q} size="sm" variant="secondary" onClick={() => send(q)}>{q}</Button>
            ))}
          </div>

          <div style={{ padding: "var(--space-3) var(--space-4) var(--space-4)", borderTop: "1px solid var(--border-subtle)" }}>
            <ChatComposer allowAttachments={false} placeholder="Message" onSend={(d: ChatDraft) => send(d.text)} />
          </div>
        </div>
      )}

      {booking && (
        <Suspense fallback={null}>
          <BookingWizard onClose={() => setBooking(false)} />
        </Suspense>
      )}
    </>
  );
}
