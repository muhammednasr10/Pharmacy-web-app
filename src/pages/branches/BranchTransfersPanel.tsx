import BranchTransferModal from "../../components/BranchTransferModal";
import type { BranchesPageState } from "./useBranchesPageState";

type Props = { state: BranchesPageState };

export default function BranchTransfersPanel({ state }: Props) {
  const {
    isArabic,
    t,
    branches,
    appUser,
    user,
    canTransfer,
    showBranchTransferModal,
    setShowBranchTransferModal,
    pendingBranchTransferGroups,
    completedBranchTransferGroups,
    resolveBranchLabel,
    getPharmacyId,
    onTransferComplete,
    handleApproveBranchTransfer,
    handleRejectBranchTransfer,
    printBranchTransferRecords,
  } = state;

  return (
    <>
      {showBranchTransferModal && (
        <BranchTransferModal
          branches={branches}
          defaultFromBranchId={getPharmacyId()}
          isArabic={isArabic}
          userId={user?.uid}
          userName={appUser?.name}
          onClose={() => setShowBranchTransferModal(false)}
          onComplete={async () => {
            await onTransferComplete();
            setShowBranchTransferModal(false);
          }}
          onPrintTransfer={printBranchTransferRecords}
        />
      )}

      {canTransfer && pendingBranchTransferGroups.length > 0 && (
        <>
          <h3 className="branchTransfersTitle branchPendingTransfersTitle">
            {isArabic ? "طلبات نقل بانتظار الاعتماد" : "Pending transfer approvals"}
          </h3>
          <div className="tableWrap">
            <table>
              <thead>
                <tr>
                  <th>{isArabic ? "الرقم" : "No."}</th>
                  <th>{isArabic ? "من" : "From"}</th>
                  <th>{isArabic ? "إلى" : "To"}</th>
                  <th>{isArabic ? "الأصناف" : "Items"}</th>
                  <th>{isArabic ? "إجمالي الكمية" : "Total qty"}</th>
                  <th>{t.date}</th>
                  <th>{t.action}</th>
                </tr>
              </thead>
              <tbody>
                {pendingBranchTransferGroups.map((group) => (
                  <tr key={group.transferNumber} className="branchPendingTransferRow">
                    <td>
                      {group.transferNumber}
                      <span className="badge warn branchTransferStatusBadge">
                        {isArabic ? "بانتظار الاعتماد" : "Pending"}
                      </span>
                    </td>
                    <td>{resolveBranchLabel(group.fromPharmacyId)}</td>
                    <td>{resolveBranchLabel(group.toPharmacyId)}</td>
                    <td>
                      <div className="branchTransferItemsCell">
                        <span className="badge ok">
                          {isArabic ? `${group.items.length} صنف` : `${group.items.length} items`}
                        </span>
                        <ul className="branchTransferItemsList">
                          {group.items.map((item) => (
                            <li key={item.id}>
                              {(isArabic ? item.medicineName_ar : item.medicineName_en) ||
                                item.medicineName_ar ||
                                "—"}{" "}
                              × {item.quantity}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </td>
                    <td>{group.totalQty}</td>
                    <td>{group.createdAt ? new Date(group.createdAt).toLocaleString() : "—"}</td>
                    <td>
                      <div className="actionButtons">
                        <button
                          type="button"
                          className="smallBtn"
                          onClick={() => void handleApproveBranchTransfer(group.transferNumber)}
                        >
                          {isArabic ? "اعتماد" : "Approve"}
                        </button>
                        <button
                          type="button"
                          className="deleteSmallBtn"
                          onClick={() => void handleRejectBranchTransfer(group.transferNumber)}
                        >
                          {isArabic ? "رفض" : "Reject"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {canTransfer && completedBranchTransferGroups.length > 0 && (
        <>
          <h3 className="branchTransfersTitle">
            {isArabic ? "سجل نقل المخزون" : "Stock transfer history"}
          </h3>
          <div className="tableWrap">
            <table>
              <thead>
                <tr>
                  <th>{isArabic ? "الرقم" : "No."}</th>
                  <th>{isArabic ? "الحالة" : "Status"}</th>
                  <th>{isArabic ? "من" : "From"}</th>
                  <th>{isArabic ? "إلى" : "To"}</th>
                  <th>{isArabic ? "الأصناف" : "Items"}</th>
                  <th>{isArabic ? "إجمالي الكمية" : "Total qty"}</th>
                  <th>{t.date}</th>
                  <th>{t.action}</th>
                </tr>
              </thead>
              <tbody>
                {completedBranchTransferGroups.map((group) => (
                  <tr key={group.transferNumber}>
                    <td>{group.transferNumber}</td>
                    <td>
                      {group.status === "rejected" ? (
                        <span className="badge danger branchTransferStatusBadge">
                          {isArabic ? "مرفوض" : "Rejected"}
                        </span>
                      ) : (
                        <span className="badge ok branchTransferStatusBadge">
                          {isArabic ? "مكتمل" : "Completed"}
                        </span>
                      )}
                    </td>
                    <td>{resolveBranchLabel(group.fromPharmacyId)}</td>
                    <td>{resolveBranchLabel(group.toPharmacyId)}</td>
                    <td>
                      <div className="branchTransferItemsCell">
                        <span className="badge ok">
                          {isArabic ? `${group.items.length} صنف` : `${group.items.length} items`}
                        </span>
                        <ul className="branchTransferItemsList">
                          {group.items.map((item) => (
                            <li key={item.id}>
                              {(isArabic ? item.medicineName_ar : item.medicineName_en) ||
                                item.medicineName_ar ||
                                "—"}{" "}
                              × {item.quantity}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </td>
                    <td>{group.totalQty}</td>
                    <td>{group.createdAt ? new Date(group.createdAt).toLocaleString() : "—"}</td>
                    <td>
                      {group.status === "completed" && (
                        <button
                          type="button"
                          className="printBtn branchTransferPrintBtn"
                          onClick={() => printBranchTransferRecords(group.items)}
                        >
                          <span aria-hidden="true">🖨️</span>
                          <span>{t.print}</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}
