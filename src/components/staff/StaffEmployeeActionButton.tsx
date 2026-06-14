type StaffActionIcon =
  | "qr"
  | "permissions"
  | "transfer"
  | "edit"
  | "deactivate"
  | "activate"
  | "delete";

type StaffActionTone = "primary" | "edit" | "danger" | "delete" | "success";

type StaffEmployeeActionButtonProps = {
  icon: StaffActionIcon;
  label: string;
  tone?: StaffActionTone;
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => void;
};

function ActionIcon({ icon }: { icon: StaffActionIcon }) {
  const common = {
    width: 18,
    height: 18,
    viewBox: "0 0 24 24",
    fill: "none" as const,
    "aria-hidden": true,
  };

  switch (icon) {
    case "qr":
      return (
        <svg {...common}>
          <rect x="3" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.75" />
          <rect x="14" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.75" />
          <rect x="3" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.75" />
          <path
            d="M14 14h2v2h-2v-2Zm4 0h2v2h-2v-2Zm-4 4h2v2h-2v-2Zm4 0h2v2h-2v-2Z"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
          />
        </svg>
      );
    case "permissions":
      return (
        <svg {...common}>
          <path
            d="M12 3 4 7v5c0 4.2 3.2 7.6 8 9 4.8-1.4 8-4.8 8-9V7l-8-4Z"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinejoin="round"
          />
          <path
            d="M9.5 12.2 11 13.7l3.5-3.6"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "transfer":
      return (
        <svg {...common}>
          <path
            d="M7 7h11M14 4l4 3-4 3M17 17H6M10 20l-4-3 4-3"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "edit":
      return (
        <svg {...common}>
          <path
            d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17v3Z"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinejoin="round"
          />
          <path
            d="m13.5 6.5 3 3"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
          />
        </svg>
      );
    case "deactivate":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.75" />
          <path d="M8 12h8" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
        </svg>
      );
    case "activate":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.75" />
          <path
            d="M9.5 12.2 11 13.7 15 9.5"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "delete":
      return (
        <svg {...common}>
          <path
            d="M4 7h16M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
          />
          <path
            d="M8 7l.8 11.2A1.5 1.5 0 0 0 10.3 19.5h3.4a1.5 1.5 0 0 0 1.5-1.3L16 7"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinejoin="round"
          />
          <path d="M10 10v5M14 10v5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
        </svg>
      );
    default:
      return null;
  }
}

export default function StaffEmployeeActionButton({
  icon,
  label,
  tone = "primary",
  disabled = false,
  loading = false,
  onClick,
}: StaffEmployeeActionButtonProps) {
  return (
    <button
      type="button"
      className={`staffActionIconBtn staffActionIconBtn--${tone}${loading ? " is-loading" : ""}`}
      disabled={disabled || loading}
      aria-label={label}
      title={label}
      onClick={onClick}
    >
      {loading ? <span className="staffActionIconSpinner" aria-hidden="true" /> : <ActionIcon icon={icon} />}
    </button>
  );
}
