import { describe, expect, it } from "vitest";
import type { EmployeeRequest, PayrollRecord } from "../../types";
import {
  applyMaxLeavePolicy,
  buildAttendanceCheckInIso,
  buildAttendanceCheckOutIso,
  calcAttendanceWorkedHours,
  calcAttendanceWorkedMinutes,
  combineWorkDateTime,
  computeAttendanceDeductionBreakdown,
  computeEarnedSalary,
  computeHourlyRate,
  computePayrollEarnedFromAttendance,
  computePayrollNet,
  computeTaxInsuranceFromPercent,
  filterAttendanceForEmployee,
  hasApprovedPermissionForDate,
  isOvernightTimePair,
  listDaysBetween,
  splitRegularAndOvertimeMinutes,
  sumPayrollAdditions,
  sumPayrollDeductions,
} from "./payrollCompute";

describe("applyMaxLeavePolicy", () => {
  it("caps leave days and moves excess to absent days", () => {
    expect(applyMaxLeavePolicy(5, 2, 3)).toEqual({
      leaveDays: 3,
      absentDays: 4,
      excessLeaveDays: 2,
    });
  });

  it("keeps leave within allowed limit", () => {
    expect(applyMaxLeavePolicy(2, 1, 5)).toEqual({
      leaveDays: 2,
      absentDays: 1,
      excessLeaveDays: 0,
    });
  });
});

describe("attendance time helpers", () => {
  it("detects overnight check-out pairs", () => {
    expect(isOvernightTimePair("23:00", "07:00")).toBe(true);
    expect(isOvernightTimePair("09:00", "17:00")).toBe(false);
  });

  it("builds check-in and overnight check-out ISO timestamps", () => {
    const checkIn = buildAttendanceCheckInIso("2026-08-05", "23:00");
    const checkOut = buildAttendanceCheckOutIso("2026-08-05", "23:00", "07:00");

    expect(checkIn).toBeTruthy();
    expect(checkOut).toBeTruthy();
    expect(new Date(checkOut!).getTime()).toBeGreaterThan(new Date(checkIn!).getTime());
  });

  it("calculates worked minutes and hours across midnight", () => {
    const checkIn = combineWorkDateTime("2026-08-05", "23:00", 0)!;
    const checkOut = combineWorkDateTime("2026-08-05", "07:00", 1)!;

    expect(calcAttendanceWorkedMinutes(checkIn, checkOut)).toBe(480);
    expect(calcAttendanceWorkedHours(checkIn, checkOut)).toBe(8);
  });
});

describe("computeAttendanceDeductionBreakdown", () => {
  it("applies absent and sick percentages against daily rate", () => {
    const breakdown = computeAttendanceDeductionBreakdown(
      { baseSalary: 3000, absentDays: 2, sickDays: 1, leaveDays: 0 },
      { absentPct: 100, sickPct: 50 },
    );

    expect(breakdown.dailyRate).toBe(100);
    expect(breakdown.absentAmount).toBe(200);
    expect(breakdown.sickAmount).toBe(50);
    expect(breakdown.attendanceTotal).toBe(250);
  });
});

describe("payroll totals", () => {
  it("sums additions and deductions", () => {
    const record: Partial<PayrollRecord> = {
      specialAllowances: 100,
      bonuses: 50,
      incentives: 25,
      commission: 25,
      deductions: 40,
      taxes: 30,
      insurance: 20,
    };

    expect(sumPayrollAdditions(record)).toBe(200);
    expect(sumPayrollDeductions(record)).toBe(90);
  });

  it("computes tax and insurance from gross salary", () => {
    const taxes = computeTaxInsuranceFromPercent(
      { calculatedSalary: 1000, bonuses: 200 },
      10,
      5,
    );

    expect(taxes.taxes).toBe(120);
    expect(taxes.insurance).toBe(60);
  });

  it("computes net pay from salary, additions, and deductions", () => {
    const net = computePayrollNet({
      calculatedSalary: 2000,
      bonuses: 100,
      deductions: 50,
      taxes: 100,
      insurance: 50,
    });

    expect(net).toBe(1900);
  });
});

describe("attendance-based earnings", () => {
  it("computes hourly rate from base salary", () => {
    expect(computeHourlyRate(2400, 8)).toBe(10);
  });

  it("splits regular and overtime minutes", () => {
    const split = splitRegularAndOvertimeMinutes(
      [{ checkIn: "2026-08-05T09:00:00.000Z", checkOut: "2026-08-05T19:00:00.000Z" }],
      8,
    );

    expect(split.regularMinutes).toBe(480);
    expect(split.overtimeMinutes).toBe(120);
    expect(split.totalMinutes).toBe(600);
  });

  it("computes earned salary from worked minutes", () => {
    const earned = computeEarnedSalary(2400, 480, 8);
    expect(earned).toBe(80);
  });

  it("includes overtime pay in attendance earnings", () => {
    const earned = computePayrollEarnedFromAttendance(
      2400,
      [{ checkIn: "2026-08-05T09:00:00.000Z", checkOut: "2026-08-05T19:00:00.000Z" }],
      8,
      8,
      150,
    );

    expect(earned.calculatedSalary).toBe(80);
    expect(earned.overtimePay).toBeGreaterThan(0);
    expect(earned.workMinutes).toBe(600);
  });
});

describe("filterAttendanceForEmployee", () => {
  it("matches by user id or employee id", () => {
    const rows = [
      { userId: "user-1" },
      { userId: "emp-2" },
      { userId: "other" },
    ];

    expect(filterAttendanceForEmployee(rows, "user-1", "emp-2")).toEqual([
      { userId: "user-1" },
      { userId: "emp-2" },
    ]);
  });
});

describe("listDaysBetween", () => {
  it("returns inclusive date list", () => {
    expect(listDaysBetween("2026-08-01", "2026-08-03")).toEqual([
      "2026-08-01",
      "2026-08-02",
      "2026-08-03",
    ]);
  });

  it("returns empty list for invalid dates", () => {
    expect(listDaysBetween("invalid", "2026-08-01")).toEqual([]);
  });
});

describe("hasApprovedPermissionForDate", () => {
  it("detects approved permission requests for the employee on a date", () => {
    const requests: EmployeeRequest[] = [
      {
        id: 1,
        userId: "user-1",
        employeeId: "emp-1",
        requestType: "permission",
        status: "approved",
        workDate: "2026-08-05",
      } as EmployeeRequest,
    ];

    expect(hasApprovedPermissionForDate(requests, "user-1", "emp-1", "2026-08-05")).toBe(true);
    expect(hasApprovedPermissionForDate(requests, "user-2", "emp-2", "2026-08-05")).toBe(false);
  });
});
