import { POS_SHORTCUTS, formatShortcutKey } from "../config/posShortcuts";

type PosShortcutsModalProps = {
  isArabic: boolean;
  isOnline: boolean;
  onClose: () => void;
};

export default function PosShortcutsModal({ isArabic, isOnline, onClose }: PosShortcutsModalProps) {
  const rows = POS_SHORTCUTS.filter((row) => !row.requiresOnline || isOnline);

  return (
    <div className="modalOverlay">
      <div
        className="invoiceModal posShortcutsModal"
        onClick={(event) => event.stopPropagation()}
        dir={isArabic ? "rtl" : "ltr"}
      >
        <div className="modalHeader">
          <div>
            <h2>{isArabic ? "اختصارات نقطة البيع" : "POS keyboard shortcuts"}</h2>
            <p>
              {isArabic
                ? "تعمل أثناء فتح صفحة نقطة البيع — مفاتيح F تعمل حتى داخل حقول الإدخال"
                : "Active on the POS page — function keys work even inside input fields"}
            </p>
          </div>
          <button type="button" className="closeBtn" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="tableWrap">
          <table>
            <thead>
              <tr>
                <th>{isArabic ? "الاختصار" : "Shortcut"}</th>
                <th>{isArabic ? "الإجراء" : "Action"}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>
                    <div className="posShortcutKeys">
                      {row.keys.map((key) => (
                        <kbd key={key} className="posShortcutKbd">
                          {formatShortcutKey(key)}
                        </kbd>
                      ))}
                    </div>
                  </td>
                  <td>{isArabic ? row.labelAr : row.labelEn}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="modalActions">
          <button type="button" className="completeBtn" onClick={onClose}>
            {isArabic ? "إغلاق" : "Close"}
          </button>
        </div>
      </div>
    </div>
  );
}
