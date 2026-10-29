import { Suspense, lazy, useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MessageCircle, Phone, Send, X } from "lucide-react";

import { Alert } from "@/components/arc/alert/alert";
import { Button } from "@/components/arc/button/button";
import { Input } from "@/components/arc/input/input";
import { Textarea } from "@/components/arc/textarea/textarea";
import { useAuth } from "@/lib/AuthContext";
import { isSupabaseConfigured, sbSendCustomerChatMessage, sbSendGuestMessage } from "@/lib/supabase";
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
  const { user, profile } = useAuth();
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
  // "Message the shop": a real message that lands in the shop's inbox, unlike the scripted replies.
  const [composing, setComposing] = useState(false);
  const [sendingMsg, setSendingMsg] = useState(false);
  const [msgError, setMsgError] = useState("");
  const [contact, setContact] = useState({ name: profile?.full_name || "", email: user?.email || "", phone: profile?.phone || "", body: "" });

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
    lastAsked.current = t;
    push(ME.id, t, "delivered");
    reply(getReply(t, ctx));
  };

  const sendToShop = async () => {
    const { name, email, phone, body } = contact;

    setSendingMsg(true);
    setMsgError("");
    let ok = false;
    let error = "";

    if (user) {
      const res = await sbSendCustomerChatMessage(user.id, name || profile?.full_name || "", user.email || email, body);

      ok = !res.error;
      error = res.error && typeof res.error === "object" && "message" in res.error ? String((res.error as { message: string }).message) : "";
    } else {
      const res = await sbSendGuestMessage({ name, email, phone, body });

      ok = res.ok;
      error = res.error || "";
    }
    setSendingMsg(false);
    if (!ok) return setMsgError(error || "We couldn't send that. Please try again or call us.");
    push(ME.id, body, "delivered");
    reply([{ text: `Thanks${name ? `, ${name.split(" ")[0]}` : ""}. Your message is with the shop. A person will reply${user ? " here and by email" : email ? ` to ${email}` : " by phone"}.` }]);
    setContact((c) => ({ ...c, body: "" }));
    setComposing(false);
  };

  const canSend = !!contact.body.trim() && !!contact.name.trim() && (!!contact.email.trim() || contact.phone.replace(/\D/g, "").length >= 7 || !!user);

  const lastAsked = useRef("");

  const runAction = (a: ChatAction) => {
    if (a.kind === "message") { setContact((c) => ({ ...c, body: c.body || lastAsked.current })); setComposing(true); }
    else if (a.kind === "book") setBooking(true);
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
              <span className="mc-small">Automatic replies. Tap Message the shop to reach a person.</span>
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

          {composing ? (
            <form className="mc-chat-compose" onSubmit={(e) => { e.preventDefault(); void sendToShop(); }}>
              {!user && (
                <>
                  <Input autoComplete="name" label="Your name" required value={contact.name} onChange={(e) => setContact((c) => ({ ...c, name: e.target.value }))} />
                  <div className="mc-form-2">
                    <Input autoComplete="email" inputMode="email" label="Email" type="email" value={contact.email} onChange={(e) => setContact((c) => ({ ...c, email: e.target.value }))} />
                    <Input autoComplete="tel" inputMode="tel" label="Phone" type="tel" value={contact.phone} onChange={(e) => setContact((c) => ({ ...c, phone: e.target.value }))} />
                  </div>
                </>
              )}
              <Textarea label="Message" required rows={3} value={contact.body} onChange={(e) => setContact((c) => ({ ...c, body: e.target.value }))} />
              {msgError && <Alert title={msgError} tone="danger" />}
              <div className="mc-actions" style={{ justifyContent: "space-between" }}>
                <Button type="button" variant="ghost" onClick={() => setComposing(false)}>Back to chat</Button>
                <Button disabled={!canSend} loading={sendingMsg} type="submit"><Send aria-hidden="true" size={16} strokeWidth={1.75} />Send to shop</Button>
              </div>
            </form>
          ) : (
            <>
              <div className="mc-chat-quick">
                {actions.map((a) => (
                  a.kind === "message" ? <Button key={a.label} onClick={() => runAction(a)}>{a.label}</Button>
                  : a.kind === "tel" ? <a key={a.label} href={`tel:${digits}`} style={{ textDecoration: "none" }}><Button tabIndex={-1}>{a.label}</Button></a>
                  : a.kind === "sms" ? <a key={a.label} href={`sms:${digits}`} style={{ textDecoration: "none" }}><Button tabIndex={-1}>{a.label}</Button></a>
                  : <Button key={a.label} onClick={() => runAction(a)}>{a.label}</Button>
                ))}
                {isSupabaseConfigured() && !actions.some((a) => a.kind === "message") && <Button onClick={() => setComposing(true)}>Message the shop</Button>}
                {QUICK_REPLIES.map((q) => (
                  <Button key={q} size="sm" variant="secondary" onClick={() => send(q)}>{q}</Button>
                ))}
              </div>

              <div style={{ padding: "var(--space-3) var(--space-4) var(--space-4)", borderTop: "1px solid var(--border-subtle)" }}>
                <ChatComposer allowAttachments={false} placeholder="Ask about prices, hours, booking" onSend={(d: ChatDraft) => send(d.text)} />
              </div>
            </>
          )}
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
