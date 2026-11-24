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
        <h2>{isArabic ? "صفحات البرنامج" : "App pages"}</h2>
        <p className="loginWelcomePagesIntro">
          {isArabic
            ? "دي صفحات البرنامج الفعلية اللي بتظهر في القائمة بعد التسجيل. المتعلّم بالأحمر إضافة بالاشتراك (مش ضمن الباقة الأساسية) — تفعّلها من حاسبة الاشتراك تحت."
            : "These are the real app pages shown in the menu after signup. Items marked in red are paid subscription add-ons (not in the basic plan) — enable them from the calculator below."}
        </p>
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
                    ? "متعلّمة بالأحمر لأنها ضمن إضافة الموظفين بالاشتراك — مش سعر منفصل، تتفعل مع تشيك بوكس «الموظفين»."
                    : "Marked red as part of the paid Staff add-on — not a separate price; enable with the Staff checkbox."
                  : isArabic
                    ? "متعلّمة بالأحمر = إضافة بالاشتراك — تفعّلها من تشيك بوكس حاسبة الاشتراك."
                    : "Marked red = paid subscription add-on — enable it from the calculator checkbox."}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}
