// ABOUTME: PDF generation utilities shared across the app.
// ABOUTME: Provides markdown-to-PDF rendering via jsPDF and content formatting helpers.

import type { jsPDF as JsPDFType } from "jspdf";

interface ContentForPdf {
  title: string;
  author: string;
  url: string;
  sourceType: string;
  summary: string;
  claims: string[];
  topics: string[];
  people: string[];
}

export function pdfFilename(title: string, date: string, label?: string): string {
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+$/, "");
  const dateStr = new Date(date).toISOString().slice(0, 10);
  return label ? `${slug}-${label}-${dateStr}.pdf` : `${slug}-${dateStr}.pdf`;
}

export function formatContentAsMarkdown(item: ContentForPdf): string {
  const sections: string[] = [];

  if (item.author) {
    sections.push(`**Author:** ${item.author}`);
  }

  sections.push(`**Source:** ${item.url}`);

  if (item.topics.length > 0) {
    sections.push(`**Topics:** ${item.topics.join(", ")}`);
  }

  if (item.claims.length > 0) {
    sections.push("");
    sections.push("## Key Claims");
    for (const claim of item.claims) {
      sections.push(`- ${claim}`);
    }
  }

  if (item.people.length > 0) {
    sections.push("");
    sections.push(`**People:** ${item.people.join(", ")}`);
  }

  if (item.summary) {
    sections.push("");
    sections.push("## Summary");
    sections.push(item.summary);
  }

  return sections.join("\n");
}

export async function downloadPdf(content: string, title: string, date: string, label?: string) {
  const { jsPDF } = await import("jspdf");

  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const maxWidth = pageWidth - margin * 2;
  const footerY = pageHeight - 8;
  let y = margin;

  function addFooter() {
    const prevFontSize = doc.getFontSize();
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(160);
    doc.text("InSpire", margin, footerY);
    const pageNum = `${doc.getNumberOfPages()}`;
    doc.text(pageNum, pageWidth - margin, footerY, { align: "right" });
    doc.setTextColor(0);
    doc.setFontSize(prevFontSize);
    doc.setFont("helvetica", "normal");
  }

  function checkPageBreak(needed: number) {
    if (y + needed > footerY - 4) {
      addFooter();
      doc.addPage();
      y = margin;
    }
  }

  // Header — branding
  doc.setFontSize(24);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(80);
  doc.text("InSpire", margin, y);
  y += 5;
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(140);
  doc.text("Simple solutions to impossible problems", margin, y);
  y += 4;
  doc.setDrawColor(200);
  doc.line(margin, y, pageWidth - margin, y);
  y += 10;

  // Title
  doc.setTextColor(0);
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  const titleLines = doc.splitTextToSize(title, maxWidth);
  checkPageBreak(titleLines.length * 8);
  doc.text(titleLines, margin, y);
  y += titleLines.length * 8;

  // Date
  const dateStr = new Date(date).toLocaleDateString(undefined, {
    year: "numeric", month: "long", day: "numeric",
  });
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(120);
  doc.text(dateStr, margin, y);
  y += 8;
  doc.setTextColor(0);

  // Content — line by line with basic markdown support
  renderMarkdown(doc, content, margin, maxWidth, checkPageBreak, () => y, (val: number) => { y = val; });

  // Footer on the last page
  addFooter();

  doc.save(pdfFilename(title, date, label));
}

function renderMarkdown(
  doc: JsPDFType,
  content: string,
  margin: number,
  maxWidth: number,
  checkPageBreak: (needed: number) => void,
  getY: () => number,
  setY: (val: number) => void,
) {
  const lines = content.split("\n");
  for (const line of lines) {
    let y = getY();
    if (line.startsWith("### ")) {
      y += 3;
      setY(y);
      doc.setFontSize(13);
      doc.setFont("helvetica", "bold");
      const wrapped = doc.splitTextToSize(line.slice(4), maxWidth);
      checkPageBreak(wrapped.length * 5.5);
      y = getY();
      doc.text(wrapped, margin, y);
      setY(y + wrapped.length * 5.5 + 1);
      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
    } else if (line.startsWith("## ")) {
      y += 5;
      setY(y);
      doc.setFontSize(15);
      doc.setFont("helvetica", "bold");
      const wrapped = doc.splitTextToSize(line.slice(3), maxWidth);
      checkPageBreak(wrapped.length * 6.5);
      y = getY();
      doc.text(wrapped, margin, y);
      setY(y + wrapped.length * 6.5 + 2);
      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
    } else if (line.startsWith("# ")) {
      y += 5;
      setY(y);
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      const wrapped = doc.splitTextToSize(line.slice(2), maxWidth);
      checkPageBreak(wrapped.length * 7.5);
      y = getY();
      doc.text(wrapped, margin, y);
      setY(y + wrapped.length * 7.5 + 2);
      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
    } else if (line.trim() === "") {
      setY(y + 3);
    } else {
      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      const text = line.replace(/\*\*(.*?)\*\*/g, "$1");
      const wrapped = doc.splitTextToSize(text, maxWidth);
      checkPageBreak(wrapped.length * 5);
      y = getY();
      doc.text(wrapped, margin, y);
      setY(y + wrapped.length * 5);
    }
  }
}
