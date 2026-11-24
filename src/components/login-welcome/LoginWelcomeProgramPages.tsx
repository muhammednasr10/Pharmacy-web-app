import { useMemo, useState } from "react";
import { PROGRAM_PAGES, type ProgramPageKey } from "./programPages";

type LoginWelcomeProgramPagesProps = {
  isArabic: boolean;
  staffAddonEnabled: boolean;
  customersAddonEnabled: boolean;
  investmentAddonEnabled: boolean;
};

function isAddonOn(
  pageKey: ProgramPageKey,
  staffAddonEnabled: boolean,
  customersAddonEnabled: boolean,
  investmentAddonEnabled: boolean,
) {
  if (pageKey === "users" || pageKey === "employeePortal") return staffAddonEnabled;
  if (pageKey === "customers") return customersAddonEnabled;
  if (pageKey === "costs") return investmentAddonEnabled;
  return false;
}

export default function LoginWelcomeProgramPages({
  isArabic,
  staffAddonEnabled,
  customersAddonEnabled,
  investmentAddonEnabled,
}: LoginWelcomeProgramPagesProps) {
  const [selectedPageKey, setSelectedPageKey] = useState<ProgramPageKey | null>(null);

  const selectedPage = useMemo(
    () => PROGRAM_PAGES.find((page) => page.key === selectedPageKey) || null,
    [selectedPageKey],
  );

  return (
    <section className="loginWelcomePages" aria-label={isArabic ? "صفحات البرنامج" : "App pages"}>
      <div className="loginWelcomePlansHeader">
        <h2>{isArabic ? "صفحات البرنامج" : "What’s inside"}</h2>
      </div>
      <ul className="loginWelcomePageList">
        {PROGRAM_PAGES.map((page) => {
          const addonEnabled =
            page.hasCheckbox &&
            isAddonOn(page.key, staffAddonEnabled, customersAddonEnabled, investmentAddonEnabled);
          return (
            <li key={page.key}>
              <button
                type="button"
                className={[
                  "loginWelcomePageItem",
                  page.hasCheckbox ? "is-addon" : "",
                  addonEnabled ? "is-addon-on" : "",
                  selectedPageKey === page.key ? "is-open" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onClick={() => setSelectedPageKey(page.key)}
                aria-haspopup="dialog"
                aria-expanded={selectedPageKey === page.key}
              >
                <strong>{isArabic ? page.ar : page.en}</strong>
              </button>
            </li>
          );
        })}
      </ul>

      {selectedPage ? (
        <div
          className="modalOverlay loginWelcomePageModalOverlay"
          role="presentation"
          onClick={() => setSelectedPageKey(null)}
        >
          <div
            className={[
              "modalContent loginWelcomePageCard",
              selectedPage.hasCheckbox ? "is-addon" : "",
              selectedPage.hasCheckbox &&
              isAddonOn(
                selectedPage.key,
                staffAddonEnabled,
                customersAddonEnabled,
                investmentAddonEnabled,
              )
                ? "is-addon-on"
                : "",
            ]
              .filter(Boolean)
              .join(" ")}
            role="dialog"
            aria-modal="true"
            aria-labelledby="login-welcome-page-card-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="loginWelcomePageCardHeader">
              <h3 id="login-welcome-page-card-title">
                {isArabic ? selectedPage.ar : selectedPage.en}
              </h3>
              <button type="button" className="editBtn" onClick={() => setSelectedPageKey(null)}>
                {isArabic ? "إغلاق" : "Close"}
              </button>
            </div>
            <p className="loginWelcomePageCardBody">
              {isArabic ? selectedPage.descAr : selectedPage.descEn}
            </p>
            <ul className="loginWelcomePageCardPoints">
              {(isArabic ? selectedPage.pointsAr : selectedPage.pointsEn).map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
            {selectedPage.hasCheckbox ? (
              <p className="loginWelcomePageCardHint">
                {selectedPage.key === "employeePortal"
                  ? isArabic
                    ? "مش إضافة منفصلة — تتفعل وتتسعر مع تشيك بوكس «الموظفين» في الحاسبة."
                    : "Not a separate add-on — enabled and priced with the Staff checkbox in the calculator."
                  : isArabic
                    ? "إضافة اختيارية — تفعّلها من تشيك بوكس حاسبة الاشتراك."
                    : "Optional add-on — enable it from the subscription calculator checkbox."}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}
