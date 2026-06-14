import { useEffect, useState } from "react";
import QRCode from "qrcode";
import type { Employee } from "../types";
import { buildEmployeeAttendanceToken } from "../utils/employeeAttendanceCode";

type EmployeeAttendanceBadgeModalProps = {
  isArabic: boolean;
  employee: Employee;
  branchLabel?: string;
  onClose: () => void;
};

export default function EmployeeAttendanceBadgeModal({
  isArabic,
  employee,
  branchLabel,
  onClose,
}: EmployeeAttendanceBadgeModalProps) {
  const [qrDataUrl, setQrDataUrl] = useState("");
  const token = buildEmployeeAttendanceToken(
    employee.pharmacyId,
    employee.employeeCode || employee.id,
  );

  useEffect(() => {
    let cancelled = false;
    void QRCode.toDataURL(token, { margin: 1, width: 240 }).then((url) => {
      if (!cancelled) setQrDataUrl(url);
    });
    return () => {
      cancelled = true;
    };
  }, [token]);

  function handlePrint() {
    window.print();
  }

  return (
    <div className="modalOverlay employeeBadgeOverlay">
      <div
        className="employeeAttendanceBadgeModal"
        onClick={(event) => event.stopPropagation()}
        dir={isArabic ? "rtl" : "ltr"}
      >
        <div className="modalHeader">
          <h3>{isArabic ? "بطاقة حضور الموظف" : "Employee attendance badge"}</h3>
          <button type="button" className="closeBtn" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="employeeAttendanceBadgeCard" id="employee-attendance-badge-print">
          <p className="employeeBadgeBranch">{branchLabel || employee.pharmacyId}</p>
          <h4>{employee.name}</h4>
          <p className="employeeBadgeCode" dir="ltr">
            {employee.employeeCode || "—"}
          </p>
          {qrDataUrl ? (
            <img
              src={qrDataUrl}
              alt={isArabic ? "QR الحضور" : "Attendance QR"}
              className="employeeBadgeQr"
            />
          ) : (
            <p className="mutedText">{isArabic ? "جاري إنشاء QR..." : "Generating QR..."}</p>
          )}
          <p className="employeeBadgeHint">
            {isArabic
              ? "امسح البطاقة عند دخول/خروج الصيدلية"
              : "Scan this badge when checking in or out"}
          </p>
        </div>

        <div className="modalActions">
          <button type="button" className="ghostBtn" onClick={onClose}>
            {isArabic ? "إغلاق" : "Close"}
          </button>
          <button type="button" className="printBtn" onClick={handlePrint}>
            {isArabic ? "طباعة البطاقة" : "Print badge"}
          </button>
        </div>
      </div>
    </div>
  );
}
