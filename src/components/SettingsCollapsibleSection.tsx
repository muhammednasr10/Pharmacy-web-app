import { useState, type ReactNode } from "react";

type SettingsCollapsibleSectionProps = {
  title: string;
  meta?: string;
  defaultOpen?: boolean;
  className?: string;
  children: ReactNode;
};

export default function SettingsCollapsibleSection({
  title,
  meta,
  defaultOpen = false,
  className = "",
  children,
}: SettingsCollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section
      className={`card collapsibleSummaryCard employeeSettingsCollapsibleCard ${className}`.trim()}
    >
      <button
        type="button"
        className="collapsibleSummaryHead"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span className={`collapsibleSummaryChevron${open ? " open" : ""}`} aria-hidden>
          ▶
        </span>
        <h3>{title}</h3>
        {meta ? <span className="collapsibleSummaryMeta">{meta}</span> : null}
      </button>
      {open ? <div className="collapsibleSummaryBody">{children}</div> : null}
    </section>
  );
}
