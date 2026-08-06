import type { PendingBranchTransferGroup } from "./types";

type DashboardPendingTransfersProps = {
  isArabic: boolean;
  t: Record<string, string>;
  pendingBranchTransferGroups: PendingBranchTransferGroup[];
  getBranchLabel?: (branchId: string | undefined) => string;
  onApproveBranchTransfer: (transferNumber: string) => void | Promise<void>;
  onRejectBranchTransfer: (transferNumber: string) => void | Promise<void>;
};

export default function DashboardPendingTransfers({
  isArabic,
  t,
  pendingBranchTransferGroups,
  getBranchLabel,
  onApproveBranchTransfer,
  onRejectBranchTransfer,
}: DashboardPendingTransfersProps) {
  if (pendingBranchTransferGroups.length === 0) return null;

  return (
    <section className="card dashboardPendingTransfers">
      <div className="cardHeader">
        <h2>{isArabic ? "طلبات نقل بانتظار الاعتماد" : "Pending transfer approvals"}</h2>
        <span className="badge warn">{pendingBranchTransferGroups.length}</span>
      </div>
      <div className="tableWrap">
        <table>
          <thead>
            <tr>
              <th>{isArabic ? "الرقم" : "No."}</th>
              <th>{isArabic ? "من" : "From"}</th>
              <th>{isArabic ? "إلى" : "To"}</th>
              <th>{isArabic ? "الأصناف" : "Items"}</th>
              <th>{isArabic ? "الكمية" : "Qty"}</th>
              <th>{t.date}</th>
              <th>{t.action}</th>
            </tr>
          </thead>
          <tbody>
            {pendingBranchTransferGroups.map((group) => (
              <tr key={group.transferNumber}>
                <td>{group.transferNumber}</td>
                <td>
                  {getBranchLabel ? getBranchLabel(group.fromPharmacyId) : group.fromPharmacyId}
                </td>
                <td>
                  {getBranchLabel ? getBranchLabel(group.toPharmacyId) : group.toPharmacyId}
                </td>
                <td>{group.items?.length ?? 0}</td>
                <td>{group.totalQty}</td>
                <td>{group.createdAt ? new Date(group.createdAt).toLocaleString() : "—"}</td>
                <td>
                  <div className="actionButtons">
                    <button
                      type="button"
                      className="smallBtn"
                      onClick={() => void onApproveBranchTransfer(group.transferNumber)}
                    >
                      {isArabic ? "اعتماد" : "Approve"}
                    </button>
                    <button
                      type="button"
                      className="deleteSmallBtn"
                      onClick={() => void onRejectBranchTransfer(group.transferNumber)}
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
    </section>
  );
}
