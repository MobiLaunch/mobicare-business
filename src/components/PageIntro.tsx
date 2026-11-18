import type { ReactNode } from "react";

import { useCopy } from "@/lib/copy";

interface Props {
  title: ReactNode;
  lead?: ReactNode;
  kicker?: ReactNode;
  aside?: ReactNode;
  children?: ReactNode;
  /** Click-to-edit paths used by the design studio preview. */
  editTitle?: string;
  editLead?: string;
  editKicker?: string;
}

/** Shared page opener: tinted band, brand mark, headline and lead. Gives every inner page the same rhythm as the home hero. */
export default function PageIntro({ title, lead, kicker, aside, children, editTitle, editLead, editKicker }: Props) {
  const c = useCopy();
  const ed = (path?: string) => (path ? c.p(path) : {});
  return (
    <div className="mc-band mc-band--tint mc-intro">
      <div className="mc-page mc-intro-in">
        <div className="mc-intro-copy">
          <span aria-hidden="true" className="mc-mark" />
          {kicker ? <p className="mc-small" {...ed(editKicker)}>{kicker}</p> : null}
          <h1 className="mc-h1" {...ed(editTitle)}>{title}</h1>
          {lead ? <p className="mc-lead" {...ed(editLead)}>{lead}</p> : null}
          {children}
        </div>
        {aside ? <div className="mc-intro-aside">{aside}</div> : null}
      </div>
    </div>
  );
}
