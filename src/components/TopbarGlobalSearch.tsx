import { useEffect, useMemo, useRef, useState } from "react";
import type { CustomerDebt, Invoice, Medicine, Page } from "../types";
import {
  buildGlobalSearchResults,
  type GlobalSearchResult,
} from "../utils/globalSearch";

type TopbarGlobalSearchProps = {
  isArabic: boolean;
  t: Record<string, string>;
  allowedPages: Page[];
  medicines: Medicine[];
  invoices: Invoice[];
  customerDebts: CustomerDebt[];
  canSearchMedicines: boolean;
  canSearchInvoices: boolean;
  canSearchCustomers: boolean;
  onSelect: (result: GlobalSearchResult) => void;
  focusToken?: number;
};

const MAX_SUGGESTIONS = 8;

export default function TopbarGlobalSearch({
  isArabic,
  t,
  allowedPages,
  medicines,
  invoices,
  customerDebts,
  canSearchMedicines,
  canSearchInvoices,
  canSearchCustomers,
  onSelect,
  focusToken = 0,
}: TopbarGlobalSearchProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
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
      }).slice(0, MAX_SUGGESTIONS),
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

  useEffect(() => {
    if (focusToken <= 0) return;
    const input = inputRef.current;
    if (!input) return;
    input.focus();
    input.select();
    setOpen(true);
  }, [focusToken]);

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

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  function moveSelection(delta: number) {
    if (results.length === 0) return;
    setActiveIndex((index) => {
      const next = index + delta;
      if (next < 0) return results.length - 1;
      if (next >= results.length) return 0;
      return next;
    });
  }

  function handleSelect(result: GlobalSearchResult) {
    onSelect(result);
    setQuery("");
    setOpen(false);
    inputRef.current?.blur();
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      moveSelection(1);
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setOpen(true);
      moveSelection(-1);
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      const selected = results[activeIndex];
      if (selected) handleSelect(selected);
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
      inputRef.current?.blur();
    }
  }

  const showDropdown = open && query.trim().length > 0;

  return (
    <div className="topbarSearchWrap" ref={wrapRef}>
      <div className="topbarSearchInputRow">
        <svg
          className="topbarSearchInputIcon"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" />
          <path
            d="M20 20l-3.5-3.5"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
        <input
          ref={inputRef}
          type="search"
          className="topbarSearchInput"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={
            isArabic
              ? "ابحث عن صفحة، دواء، فاتورة..."
              : "Search pages, medicines, invoices..."
          }
          autoComplete="off"
          spellCheck={false}
          aria-label={isArabic ? "بحث ذكي" : "Smart search"}
          aria-expanded={showDropdown}
          aria-controls="topbar-search-suggestions"
          role="combobox"
        />
        <kbd className="topbarSearchKbd">Ctrl+K</kbd>
      </div>

      {showDropdown && (
        <div
          id="topbar-search-suggestions"
          className="topbarSearchDropdown"
          role="listbox"
          aria-label={isArabic ? "اقتراحات البحث" : "Search suggestions"}
        >
          {results.length === 0 ? (
            <div className="topbarSearchEmpty">
              {isArabic ? "لا توجد نتائج" : "No results found"}
            </div>
          ) : (
            results.map((item, index) => (
              <button
                key={item.id}
                type="button"
                role="option"
                aria-selected={index === activeIndex}
                className={`topbarSearchSuggestion ${index === activeIndex ? "active" : ""}`}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => handleSelect(item)}
              >
                <span className="topbarSearchSuggestionIcon" aria-hidden="true">
                  {item.icon}
                </span>
                <span className="topbarSearchSuggestionText">
                  <span className="topbarSearchSuggestionTitle">{item.title}</span>
                  {item.subtitle ? (
                    <span className="topbarSearchSuggestionSubtitle">{item.subtitle}</span>
                  ) : null}
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
