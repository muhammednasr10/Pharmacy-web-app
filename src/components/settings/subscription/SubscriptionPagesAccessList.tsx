import {
  getPageAccessStatusLabel,
  type SubscriptionPageAccessRow,
} from "../../../utils/subscriptionLimitChange";

type Props = {
  isArabic: boolean;
  rows: SubscriptionPageAccessRow[];
  title?: string;
};

export default function SubscriptionPagesAccessList({ isArabic, rows, title }: Props) {
  return (
    <div className="subscriptionPagesAccessBlock">
      <h5>{title || (isArabic ? "الصفحات في باقتك" : "Pages in your package")}</h5>
      <ul className="subscriptionPagesAccessList">
        {rows.map((row) => (
          <li
            key={row.key}
            className={
              row.included
                ? "subscriptionPageAccessRow is-included"
                : "subscriptionPageAccessRow is-excluded"
            }
          >
            <span>{row.label}</span>
            <strong>{getPageAccessStatusLabel(row.included, isArabic)}</strong>
          </li>
        ))}
      </ul>
    </div>
  );
}
