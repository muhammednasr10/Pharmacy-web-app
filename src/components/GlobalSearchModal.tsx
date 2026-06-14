import { useEffect, useMemo, useRef, useState } from "react";
import {
  buildGlobalSearchResults,
  groupGlobalSearchResults,
  type GlobalSearchResult,
} from "../utils/globalSearch";
import type { CustomerDebt, Invoice, Medicine, Page } from "../types";

type GlobalSearchModalProps = {
  isArabic: boolean;
  t: Record<string, string>;
  allowedPages: Page[];
  medicines: Medicine[];
  invoices: Invoice[];
  customerDebts: CustomerDebt[];
  canSearchMedicines: boolean;
  canSearchInvoices: boolean;
  canSearchCustomers: boolean;
  onClose: () => void;
  onSelect: (result: GlobalSearchResult) => void;
};

export default function GlobalSearchModal({
  isArabic,
  t,
  allowedPages,
  medicines,
  invoices,
  customerDebts,
  canSearchMedicines,
  canSearchInvoices,
  canSearchCustomers,
  onClose,
  onSelect,
}: GlobalSearchModalProps) {
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const results = useMemo(
    () =>
      buildGlobalSearchResults({
        query,
        isArabic,
        t,
        allowedPages,
        medicines,
        invoices,
        customerDebts,
        canSearchMedicines,
        canSearchInvoices,
        canSearchCustomers,
      }),
    [
      query,
      isArabic,
      t,
      allowedPages,
      medicines,
      invoices,
      customerDebts,
      canSearchMedicines,
      canSearchInvoices,
      canSearchCustomers,
    ],
  );

  const groups = useMemo(() => groupGlobalSearchResults(results), [results]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    if (results.length === 0) {
      setActiveIndex(0);
      return;
    }
    setActiveIndex((index) => Math.min(index, results.length - 1));
  }, [results.length]);

  function moveSelection(delta: number) {
    if (results.length === 0) return;
    setActiveIndex((index) => {
      const next = index + delta;
      if (next < 0) return results.length - 1;
      if (next >= results.length) return 0;
      return next;
    });
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      moveSelection(1);
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      moveSelection(-1);
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      const selected = results[activeIndex];
      if (selected) onSelect(selected);
    }
  }

  let flatIndex = -1;

  return (
    <div className="modalOverlay globalSearchOverlay">
      <div
        className="globalSearchModal"
        onClick={(event) => event.stopPropagation()}
        dir={isArabic ? "rtl" : "ltr"}
        role="dialog"
        aria-modal="true"
        aria-label={isArabic ? "بحث عام" : "Global search"}
      >
        <div className="globalSearchInputRow">
          <span className="globalSearchInputIcon" aria-hidden="true">
            🔍
          </span>
          <input
            ref={inputRef}
            className="globalSearchInput"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              isArabic
                ? "ابحث عن صفحة، دواء، فاتورة، أو عميل..."
                : "Search pages, medicines, invoices, or customers..."
            }
            autoComplete="off"
            spellCheck={false}
          />
          <kbd className="globalSearchKbd">Esc</kbd>
        </div>

        <div className="globalSearchBody">
          {!query.trim() ? (
            <div className="globalSearchEmpty">
              <p>
                {isArabic
                  ? "اكتب للبحث — أو استخدم الاختصار"
                  : "Type to search — or use the shortcut"}
              </p>
              <kbd className="globalSearchKbd">Ctrl + K</kbd>
            </div>
          ) : results.length === 0 ? (
            <div className="globalSearchEmpty">
              <p>{isArabic ? "لا توجد نتائج" : "No results found"}</p>
            </div>
          ) : (
            groups.map((group) => (
              <section key={group.id} className="globalSearchGroup">
                <h3>{isArabic ? group.labelAr : group.labelEn}</h3>
                <ul>
                  {group.items.map((item) => {
                    flatIndex += 1;
                    const index = flatIndex;
                    const isActive = index === activeIndex;
                    return (
                      <li key={item.id}>
                        <button
                          type="button"
                          className={`globalSearchResult ${isActive ? "active" : ""}`}
                          onMouseEnter={() => setActiveIndex(index)}
                          onClick={() => onSelect(item)}
                        >
                          <span className="globalSearchResultIcon" aria-hidden="true">
                            {item.icon}
                          </span>
                          <span className="globalSearchResultText">
                            <span className="globalSearchResultTitle">{item.title}</span>
                            {item.subtitle ? (
                              <span className="globalSearchResultSubtitle">{item.subtitle}</span>
                            ) : null}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))
          )}
        </div>

        <div className="globalSearchFooter">
          <span>
            <kbd className="globalSearchKbd">↑↓</kbd>
            {isArabic ? " تنقل" : " navigate"}
          </span>
          <span>
            <kbd className="globalSearchKbd">Enter</kbd>
            {isArabic ? " اختيار" : " select"}
          </span>
          <span>
            <kbd className="globalSearchKbd">Ctrl + K</kbd>
            {isArabic ? " إغلاق" : " close"}
          </span>
        </div>
      </div>
    </div>
  );
}
