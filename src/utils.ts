import { Transaction } from "./services/ocrService";

export function convertToCSV(transactions: Transaction[]): string {
  const headers = ["Date", "Description", "Amount", "Notes"];
  const rows = transactions.map(t => [
    `"${t.date.replace(/"/g, '""')}"`,
    `"${t.description.replace(/"/g, '""')}"`,
    t.amount,
    `"${(t.notes || "").replace(/"/g, '""')}"`
  ]);

  return [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
}

export function downloadCSV(csvContent: string, fileName: string = "bank_statement.csv") {
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", fileName);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
