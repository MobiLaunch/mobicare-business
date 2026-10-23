import type { ReactNode } from "react";

interface Props {
  title: ReactNode;
  lead?: ReactNode;
  kicker?: ReactNode;
  aside?: ReactNode;
  children?: ReactNode;
}

/** Shared page opener: tinted band, brand mark, headline and lead. Gives every inner page the same rhythm as the home hero. */
export default function PageIntro({ title, lead, kicker, aside, children }: Props) {
  return (
    <div className="mc-band mc-band--tint mc-intro">
      <div className="mc-page mc-intro-in">
        <div className="mc-intro-copy">
          <span aria-hidden="true" className="mc-mark" />
          {kicker ? <p className="mc-small">{kicker}</p> : null}
          <h1 className="mc-h1">{title}</h1>
          {lead ? <p className="mc-lead">{lead}</p> : null}
          {children}
        </div>
        {aside ? <div className="mc-intro-aside">{aside}</div> : null}
      </div>
    </div>
  );
}
