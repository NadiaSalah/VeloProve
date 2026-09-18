/**
 * Minimal single-page PDF writer (no external deps) for executive summaries.
 * Produces a valid PDF-1.4 text document.
 */
import fs from 'node:fs';
import path from 'node:path';

function escapePdfText(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

/** Build PDF-1.4 bytes as a UTF-8 string (no filesystem write). */
export function buildSimplePdf(title: string, lines: string[]): string {
  const contentLines = [title, '', ...lines].slice(0, 60);
  const textOps = contentLines
    .map((line, i) => {
      const y = 800 - i * 14;
      const fontSize = i === 0 ? 16 : 11;
      return `BT /F1 ${fontSize} Tf 50 ${y} Td (${escapePdfText(line.slice(0, 95))}) Tj ET`;
    })
    .join('\n');

  const stream = `${textOps}\n`;
  const objects: string[] = [];

  objects.push('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');
  objects.push('2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n');
  objects.push(
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n'
  );
  objects.push(
    `4 0 obj\n<< /Length ${Buffer.byteLength(stream, 'utf8')} >>\nstream\n${stream}\nendstream\nendobj\n`
  );
  objects.push('5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n');

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [0];
  for (const obj of objects) {
    offsets.push(Buffer.byteLength(pdf, 'utf8'));
    pdf += obj;
  }

  const xrefPos = Buffer.byteLength(pdf, 'utf8');
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';
  for (let i = 1; i < offsets.length; i++) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF\n`;
  return pdf;
}

export function writeSimplePdf(filePath: string, title: string, lines: string[]): number {
  const pdf = buildSimplePdf(title, lines);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, pdf, 'utf8');
  return Buffer.byteLength(pdf, 'utf8');
}
