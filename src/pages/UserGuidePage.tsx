import { useState } from "react";
import {
  GLOBAL_SHORTCUTS,
  formatShortcutKey,
  getPosShortcutsForGuide,
} from "../config/appShortcuts";
import { USER_GUIDE_SECTIONS } from "../config/userGuideSections";

type UserGuidePageProps = {
  isArabic: boolean;
};

type TabId = "guide" | "shortcuts";

function ShortcutKeys({ keys }: { keys: string[] }) {
  return (
    <div className="guideShortcutKeys">
      {keys.map((key) => (
        <kbd key={key} className="posShortcutKbd">
          {formatShortcutKey(key)}
        </kbd>
      ))}
    </div>
  );
}

export default function UserGuidePage({ isArabic }: UserGuidePageProps) {
  const [tab, setTab] = useState<TabId>("guide");
  const posShortcuts = getPosShortcutsForGuide();

  return (
    <div className="userGuidePage" dir={isArabic ? "rtl" : "ltr"}>
      <header className="userGuideHeader card">
        <div>
          <h2>{isArabic ? "دليل استخدام البرنامج" : "User guide"}</h2>
          <p className="pageHint">
            {isArabic
              ? "شرح سريع للصفحات الأساسية واختصارات لوحة المفاتيح"
              : "Quick overview of main features and keyboard shortcuts"}
          </p>
        </div>
        <div className="userGuideTabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={tab === "guide"}
            className={tab === "guide" ? "userGuideTab active" : "userGuideTab"}
            onClick={() => setTab("guide")}
          >
            {isArabic ? "دليل التعامل" : "How to use"}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "shortcuts"}
            className={tab === "shortcuts" ? "userGuideTab active" : "userGuideTab"}
            onClick={() => setTab("shortcuts")}
          >
            {isArabic ? "اختصارات لوحة المفاتيح" : "Keyboard shortcuts"}
          </button>
        </div>
      </header>

      {tab === "guide" && (
        <div className="userGuideSections">
          {USER_GUIDE_SECTIONS.map((section) => (
            <article key={section.id} className="card userGuideSection">
              <h3>
                <span className="userGuideSectionIcon" aria-hidden="true">
                  {section.icon}
                </span>
                {isArabic ? section.titleAr : section.titleEn}
              </h3>
              <ul className="userGuideList">
                {(isArabic ? section.bodyAr : section.bodyEn).map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
              {(isArabic ? section.tipsAr : section.tipsEn)?.length ? (
                <div className="userGuideTips">
                  <strong>{isArabic ? "نصيحة" : "Tip"}</strong>
                  <ul>
                    {(isArabic ? section.tipsAr : section.tipsEn)!.map((tip) => (
                      <li key={tip}>{tip}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </article>
          ))}
        </div>
      )}

      {tab === "shortcuts" && (
        <div className="userGuideShortcuts">
          <section className="card userGuideShortcutBlock">
            <h3>{isArabic ? "اختصارات عامة" : "Global shortcuts"}</h3>
            <p className="pageHint">
              {isArabic ? "تعمل في معظم صفحات البرنامج" : "Work across most of the app"}
            </p>
            <div className="tableWrap">
              <table className="dataTable">
                <thead>
                  <tr>
                    <th>{isArabic ? "الاختصار" : "Shortcut"}</th>
                    <th>{isArabic ? "الإجراء" : "Action"}</th>
                    <th>{isArabic ? "النطاق" : "Scope"}</th>
                  </tr>
                </thead>
                <tbody>
                  {GLOBAL_SHORTCUTS.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <ShortcutKeys keys={row.keys} />
                      </td>
                      <td>{isArabic ? row.labelAr : row.labelEn}</td>
                      <td>{isArabic ? row.scopeAr : row.scopeEn}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="card userGuideShortcutBlock">
            <h3>{isArabic ? "اختصارات نقطة البيع" : "POS shortcuts"}</h3>
            <p className="pageHint">
              {isArabic
                ? "تعمل داخل صفحة نقطة البيع — مفاتيح F تعمل حتى داخل حقول الإدخال"
                : "Active on the POS page — function keys work inside input fields"}
            </p>
            <div className="tableWrap">
              <table className="dataTable">
                <thead>
                  <tr>
                    <th>{isArabic ? "الاختصار" : "Shortcut"}</th>
                    <th>{isArabic ? "الإجراء" : "Action"}</th>
                  </tr>
                </thead>
                <tbody>
                  {posShortcuts.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <ShortcutKeys keys={row.keys} />
                      </td>
                      <td>{isArabic ? row.labelAr : row.labelEn}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
