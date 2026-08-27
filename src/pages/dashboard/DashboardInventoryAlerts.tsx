import type { Medicine } from "../../types";

type DashboardInventoryAlertsProps = {
  isArabic: boolean;
  lowStockCount: number;
  expiringCount: number;
  expiredCount: number;
  lowStockMedicines: Medicine[];
  expiringSoonMedicines: Medicine[];
  expiredMedicines: Medicine[];
  showBranchInAlertLists: boolean;
  getBranchLabel?: (branchId: string | undefined) => string;
  onOpenInventory: (filter: "all" | "low" | "expiring" | "expired") => void;
  onOpenReorderSuggestions?: () => void;
};

function alertMedicineKey(medicine: Medicine) {
  return `${medicine.pharmacyId || "local"}-${medicine.id}`;
}

function emptyAlertMessage(
  isArabic: boolean,
  count: number,
  noneAr: string,
  noneEn: string,
) {
  if (count > 0) {
    return isArabic
      ? `فيه ${count} صنف — افتح المخزون لعرض التفاصيل`
      : `${count} items — open inventory to view details`;
  }
  return isArabic ? noneAr : noneEn;
}

export default function DashboardInventoryAlerts({
  isArabic,
  lowStockCount,
  expiringCount,
  expiredCount,
  lowStockMedicines,
  expiringSoonMedicines,
  expiredMedicines,
  showBranchInAlertLists,
  getBranchLabel,
  onOpenInventory,
  onOpenReorderSuggestions,
}: DashboardInventoryAlertsProps) {
  return (
    <section className="alertsGrid">
      <div className="card alertCard clickableCard" onClick={() => onOpenInventory("low")}>
        <div className="cardHeader">
          <h2>{isArabic ? "أدوية ناقصة" : "Low Stock Medicines"}</h2>
          <span className="alertCountTag warn">{lowStockCount}</span>
        </div>
        {lowStockMedicines.length === 0 ? (
          <p className="empty">
            {emptyAlertMessage(isArabic, lowStockCount, "لا توجد نواقص حالياً", "No low stock medicines")}
          </p>
        ) : (
          <>
            <div className="miniList">
              {lowStockMedicines.slice(0, 5).map((medicine) => (
                <div className="miniListItem" key={alertMedicineKey(medicine)}>
                  <span>
                    {showBranchInAlertLists && getBranchLabel && medicine.pharmacyId ? (
                      <>
                        <span className="miniListBranchTag">
                          {getBranchLabel(medicine.pharmacyId)}
                        </span>
                        {" · "}
                      </>
                    ) : null}
                    {isArabic ? medicine.name_ar : medicine.name_en}
                  </span>
                  <strong>{medicine.qty}</strong>
                </div>
              ))}
            </div>
            {onOpenReorderSuggestions && (
              <button
                type="button"
                className="alertFooterBtn dashboardReorderBtn"
                onClick={(event) => {
                  event.stopPropagation();
                  onOpenReorderSuggestions();
                }}
              >
                {isArabic ? "اقتراح توريد من النواقص" : "Reorder from low stock"}
              </button>
            )}
          </>
        )}
      </div>

      <div className="card alertCard clickableCard" onClick={() => onOpenInventory("expiring")}>
        <div className="cardHeader">
          <h2>{isArabic ? "قرب انتهاء الصلاحية" : "Expiring Soon"}</h2>
          <span className="alertCountTag warn">{expiringCount}</span>
        </div>
        {expiringSoonMedicines.length === 0 ? (
          <p className="empty">
            {emptyAlertMessage(
              isArabic,
              expiringCount,
              "لا توجد أدوية قرب الانتهاء",
              "No expiring medicines",
            )}
          </p>
        ) : (
          <div className="miniList">
            {expiringSoonMedicines.slice(0, 5).map((medicine) => (
              <div className="miniListItem" key={alertMedicineKey(medicine)}>
                <span>
                  {showBranchInAlertLists && getBranchLabel && medicine.pharmacyId ? (
                    <>
                      <span className="miniListBranchTag">
                        {getBranchLabel(medicine.pharmacyId)}
                      </span>
                      {" · "}
                    </>
                  ) : null}
                  {isArabic ? medicine.name_ar : medicine.name_en}
                </span>
                <strong>{medicine.expiry}</strong>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card alertCard clickableCard" onClick={() => onOpenInventory("expired")}>
        <div className="cardHeader">
          <h2>{isArabic ? "أدوية منتهية" : "Expired Medicines"}</h2>
          <span className="alertCountTag danger">{expiredCount}</span>
        </div>
        {expiredMedicines.length === 0 ? (
          <p className="empty">
            {emptyAlertMessage(isArabic, expiredCount, "لا توجد أدوية منتهية", "No expired medicines")}
          </p>
        ) : (
          <div className="miniList">
            {expiredMedicines.slice(0, 5).map((medicine) => (
              <div className="miniListItem dangerText" key={alertMedicineKey(medicine)}>
                <span>
                  {showBranchInAlertLists && getBranchLabel && medicine.pharmacyId ? (
                    <>
                      <span className="miniListBranchTag">
                        {getBranchLabel(medicine.pharmacyId)}
                      </span>
                      {" · "}
                    </>
                  ) : null}
                  {isArabic ? medicine.name_ar : medicine.name_en}
                </span>
                <strong>{medicine.expiry}</strong>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
