function escapeCSV(value: unknown) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

export function barcodeCSV(value: unknown) {
  return `="${String(value ?? "").replace(/"/g, '""')}"`;
}

export function downloadCSV(filename: string, rows: unknown[][]) {
  const csvContent = rows
    .map((row) =>
      row
        .map((value) => {
          if (typeof value === "string" && value.startsWith("=\"")) {
            return value;
          }
          return escapeCSV(value);
        })
        .join(",")
    )
    .join("\n");

  const blob = new Blob(["\uFEFF" + csvContent], {
    type: "text/csv;charset=utf-8;",
  });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
