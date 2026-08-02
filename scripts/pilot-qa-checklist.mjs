#!/usr/bin/env node

/**
 * Pilot QA checklist — run before onboarding a pharmacy or after each release.
 * Usage: npm run qa:checklist
 */

const sections = [
  {
    title: "1) Auth & roles",
    items: [
      "Admin login works",
      "Cashier login works",
      "Cashier cannot open Settings / Staff admin pages",
      "Branch scope banner shows correct branch",
    ],
  },
  {
    title: "2) POS & sales",
    items: [
      "Open cashier shift from POS",
      "Barcode or manual search adds item to cart",
      "Complete sale generates invoice + PDF",
      "Return / instant return works on a recent invoice",
      "Held invoice can be resumed and completed",
    ],
  },
  {
    title: "3) Inventory",
    items: [
      "Add / edit medicine in inventory",
      "Stock decreases after sale",
      "Purchase increases stock",
      "Low stock / expiry alerts appear on dashboard",
    ],
  },
  {
    title: "4) HR & attendance",
    items: [
      "Employee appears in staff list",
      "GPS / QR attendance records check-in",
      "Shift assignment visible on employee record",
    ],
  },
  {
    title: "5) Multi-branch (if applicable)",
    items: [
      "Switch branch from top bar",
      "Stock is isolated per branch",
      "Branch transfer request + approval flow",
    ],
  },
  {
    title: "6) Subscription & limits",
    items: [
      "Trial / active subscription status is correct",
      "Upgrade request can be submitted",
      "Feature gates block locked pages with clear message",
    ],
  },
  {
    title: "7) Offline POS (optional)",
    items: [
      "Medicines cache loads while online",
      "Sale queues offline and syncs when back online",
    ],
  },
];

console.log("\n=== Pharmacy Pilot QA Checklist ===\n");
console.log("Run this before each pilot customer or production release.\n");

for (const section of sections) {
  console.log(section.title);
  for (const item of section.items) {
    console.log(`  [ ] ${item}`);
  }
  console.log("");
}

console.log("Tip: also run `npm test` and `npm run build` before deploy.\n");
