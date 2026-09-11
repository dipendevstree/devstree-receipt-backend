import { Injectable, Logger } from '@nestjs/common';
import { existsSync } from 'fs';
import { join } from 'path';
import PDFDocument from 'pdfkit';
import { amountInWords } from 'src/common/utils/amount-in-words.util';
import { Money } from 'src/common/utils/money.util';
import { CompanySetting } from 'src/modules/settings/entities/company-setting.entity';
import { Payment } from 'src/modules/payments/entities/payment.entity';
import { Receipt } from '../entities/receipt.entity';

export interface ReceiptPdfData {
  receipt: Receipt;
  payment: Payment;
  paymentAmount: Money;
  /** null when the project has no predefined amount — printed as "Not Defined". */
  projectAmount: Money | null;
  totalReceived: Money;
  /** null when there is no project amount to subtract from — printed as "N/A". */
  dueAmount: Money | null;
  company: CompanySetting;
  /** The administrator who generated the receipt — never a hardcoded label. */
  generatedByName: string | null;
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  BANK_TRANSFER: 'Bank Transfer',
  UPI: 'UPI',
  CHEQUE: 'Cheque',
  CASH: 'Cash',
  CREDIT_CARD: 'Credit Card',
  OTHER: 'Other',
};

/** Mirrors the palette in `components/receipts/receipt-document.tsx`. */
const C = {
  red: '#e11d3d',
  redDark: '#a8102e',
  ink: '#101828',
  inkMuted: '#5c6575',
  inkSubtle: '#98a1b0',
  pinkSurface: '#fdf2f5',
  pinkBorder: '#f7d9e1',
  line: '#e8ecf2',
  white: '#ffffff',
} as const;

const PAGE_MARGIN = 34;

/**
 * Renders the A4 payment receipt as a PDF, laid out to match the on-screen
 * receipt (`ReceiptDocument`) section for section: branded header, title block
 * with the receipt meta panel, client/project cards, the red PAYMENT DETAILS
 * banner, the project summary, amount in words, signature block and footer bar.
 *
 * Text is drawn with pdfkit's text primitives, so the output is real selectable
 * text rather than a rasterised screenshot. The logo is the supplied PNG,
 * embedded at its natural aspect ratio.
 *
 * This class has no knowledge of the financial lock policy — it draws whatever
 * amounts it is given, and the caller only invokes it once an unlock has been
 * verified.
 */
@Injectable()
export class ReceiptPdfService {
  private readonly logger = new Logger(ReceiptPdfService.name);

  /**
   * The renderer runs from `dist/`, so the asset is resolved relative to the
   * project root rather than `__dirname`. Missing artwork degrades to a text
   * wordmark instead of failing the download.
   */
  private readonly logoPath = this.resolveLogo();

  render(data: ReceiptPdfData): PDFKit.PDFDocument {
    const doc = new PDFDocument({ size: 'A4', margin: PAGE_MARGIN });
    const { receipt, payment, company } = data;

    const currency = this.printableCurrency(company);
    const companyName = company.companyName || 'DevsTree Technologies';
    const brandWord = companyName.split(' ')[0];
    const left = PAGE_MARGIN;
    const width = doc.page.width - PAGE_MARGIN * 2;

    this.drawCornerDecoration(doc);

    // ── Header ───────────────────────────────────────────────
    let y = PAGE_MARGIN + 6;
    const logoHeight = 34;
    if (this.logoPath) {
      doc.image(this.logoPath, left, y, { height: logoHeight });
    } else {
      doc.font('Helvetica-Bold').fontSize(20).fillColor(C.red).text(brandWord, left, y);
    }

    y += logoHeight + 8;
    doc
      .moveTo(left, y)
      .lineTo(left + 210, y)
      .lineWidth(0.5)
      .strokeColor(C.line)
      .stroke();

    doc
      .font('Helvetica')
      .fontSize(7)
      .fillColor(C.inkSubtle)
      .text('PEOPLE  |  TECHNOLOGY  |  GROWTH', left, y + 5, {
        characterSpacing: 1.6,
        lineBreak: false,
      });

    // Tagline, right-aligned and clear of the corner decoration.
    const taglineWidth = 168;
    const taglineX = left + width - taglineWidth;
    doc
      .font('Helvetica')
      .fontSize(10)
      .fillColor(C.inkMuted)
      .text('Innovative', taglineX, PAGE_MARGIN + 46, {
        width: taglineWidth,
        align: 'right',
        lineBreak: false,
      })
      .text('Solutions for a', taglineX, PAGE_MARGIN + 58, {
        width: taglineWidth,
        align: 'right',
        lineBreak: false,
      });
    doc
      .font('Helvetica-Bold')
      .fillColor(C.red)
      .text('Smarter Tomorrow', taglineX, PAGE_MARGIN + 70, {
        width: taglineWidth,
        align: 'right',
        lineBreak: false,
      });

    // ── Title + receipt meta panel ───────────────────────────
    y = PAGE_MARGIN + 96;

    const metaWidth = 200;
    const metaX = left + width - metaWidth;
    const metaHeight = 72;
    this.roundedRect(doc, metaX, y, metaWidth, metaHeight, 8).fill(C.pinkSurface);

    this.metaRow(doc, metaX + 12, y + 11, 'Receipt No.', receipt.receiptNumber, 'document');
    doc
      .moveTo(metaX + 12, y + 38)
      .lineTo(metaX + metaWidth - 12, y + 38)
      .lineWidth(0.5)
      .strokeColor(C.pinkBorder)
      .stroke();
    this.metaRow(
      doc,
      metaX + 12,
      y + 44,
      'Receipt Date',
      this.formatDate(receipt.receiptDate),
      'calendar',
    );

    doc
      .font('Helvetica-Bold')
      .fontSize(25)
      .fillColor(C.ink)
      .text('PAYMENT ', left, y + 4, { continued: true, lineBreak: false });
    doc.fillColor(C.red).text('RECEIPT', { lineBreak: false });

    doc
      .font('Helvetica')
      .fontSize(9)
      .fillColor(C.inkMuted)
      .text(`Thank you for your payment. We appreciate your trust in ${brandWord}.`, left, y + 38, {
        width: width - metaWidth - 20,
      });

    y += metaHeight + 16;

    // ── Client / Project cards ───────────────────────────────
    const cardGap = 12;
    const cardWidth = (width - cardGap) / 2;
    const clientLines = [payment.client?.email, payment.client?.phone, payment.client?.country]
      .filter((line): line is string => Boolean(line))
      .slice(0, 3);
    const projectLines = payment.project?.projectCode
      ? [`Project Code: ${payment.project.projectCode}`]
      : [];
    const cardHeight = 38 + Math.max(clientLines.length, projectLines.length, 1) * 11;

    this.infoCard(
      doc,
      left,
      y,
      cardWidth,
      cardHeight,
      'CLIENT',
      payment.client?.name ?? '',
      clientLines,
      'person',
    );
    this.infoCard(
      doc,
      left + cardWidth + cardGap,
      y,
      cardWidth,
      cardHeight,
      'PROJECT',
      payment.project?.projectName ?? '',
      projectLines,
      'folder',
    );

    y += cardHeight + 16;

    // ── PAYMENT DETAILS banner ───────────────────────────────
    const bannerHeight = 26;
    this.roundedRect(doc, left, y, width, bannerHeight, 8, { bottom: false }).fill(C.redDark);
    doc
      .font('Helvetica-Bold')
      .fontSize(9)
      .fillColor(C.white)
      .text('PAYMENT DETAILS', left + 14, y + 9, { characterSpacing: 1.6, lineBreak: false });
    doc
      .font('Helvetica-Oblique')
      .fontSize(8)
      .fillColor(C.white)
      .text('Building Ideas For A Better Future', left + width - 190, y + 9.5, {
        width: 176,
        align: 'right',
        lineBreak: false,
      });

    y += bannerHeight;

    // ── Detail rows ──────────────────────────────────────────
    const rows: Array<[string, string, boolean]> = [
      ['Payment Amount', this.money(currency, data.paymentAmount), true],
      [
        'Payment Method',
        PAYMENT_METHOD_LABELS[payment.paymentMethod] ?? payment.paymentMethod,
        false,
      ],
      ['Payment Date', this.formatDate(payment.paymentDate), false],
    ];
    if (payment.transactionReference) {
      rows.push(['Transaction Reference', payment.transactionReference, false]);
    }
    if (payment.bankAccount) rows.push(['Bank / Account', payment.bankAccount, false]);
    rows.push([
      'Project Amount',
      // "Not Defined" rather than a zero: the receipt is a document the client
      // keeps, and a printed 0 would state something untrue about the project.
      data.projectAmount ? this.money(currency, data.projectAmount) : 'Not Defined',
      false,
    ]);

    const rowHeight = 20;
    const rowsHeight = rows.length * rowHeight + 8;
    this.roundedRect(doc, left, y, width, rowsHeight, 8, { top: false })
      .lineWidth(0.6)
      .strokeColor(C.line)
      .stroke();

    let rowY = y + 4;
    rows.forEach(([label, value, emphasis], index) => {
      doc
        .font('Helvetica')
        .fontSize(9)
        .fillColor(C.inkMuted)
        .text(label, left + 14, rowY + 6, { width: 180, lineBreak: false });
      doc.fillColor(C.inkSubtle).text(':', left + 200, rowY + 6, { lineBreak: false });
      doc
        .font('Helvetica-Bold')
        .fontSize(emphasis ? 11 : 9.5)
        .fillColor(emphasis ? C.red : value === 'Not Defined' ? C.inkMuted : C.ink)
        .text(value, left + 214, rowY + (emphasis ? 4.5 : 6), {
          width: width - 228,
          align: 'right',
          lineBreak: false,
        });

      if (index < rows.length - 1) {
        doc
          .moveTo(left + 14, rowY + rowHeight)
          .lineTo(left + width - 14, rowY + rowHeight)
          .lineWidth(0.5)
          .strokeColor(C.line)
          .stroke();
      }
      rowY += rowHeight;
    });

    y += rowsHeight + 12;

    // ── Project financial summary ────────────────────────────
    const summaryHeight = 40;
    const cellWidth = width / 3;
    this.roundedRect(doc, left, y, width, summaryHeight, 8)
      .lineWidth(0.6)
      .strokeColor(C.line)
      .stroke();

    const summary: Array<[string, string, string]> = [
      [
        'Project Amount',
        data.projectAmount ? this.money(currency, data.projectAmount) : 'Not Defined',
        data.projectAmount ? C.ink : C.inkMuted,
      ],
      ['Total Received', this.money(currency, data.totalReceived), C.ink],
      [
        'Remaining Due',
        data.dueAmount ? this.money(currency, data.dueAmount) : 'N/A',
        data.dueAmount ? C.red : C.inkMuted,
      ],
    ];

    summary.forEach(([label, value, colour], index) => {
      const cellX = left + cellWidth * index;
      if (index > 0) {
        doc
          .moveTo(cellX, y + 6)
          .lineTo(cellX, y + summaryHeight - 6)
          .lineWidth(0.5)
          .strokeColor(C.line)
          .stroke();
      }
      doc
        .font('Helvetica')
        .fontSize(8)
        .fillColor(C.inkMuted)
        .text(label, cellX + 12, y + 9, { width: cellWidth - 24, lineBreak: false });
      doc
        .font('Helvetica-Bold')
        .fontSize(10)
        .fillColor(colour)
        .text(value, cellX + 12, y + 22, { width: cellWidth - 24, lineBreak: false });
    });

    y += summaryHeight + 12;

    // ── Amount in words ──────────────────────────────────────
    const wordsHeight = 42;
    this.roundedRect(doc, left, y, width, wordsHeight, 8).fill(C.pinkSurface);
    doc
      .font('Helvetica')
      .fontSize(8)
      .fillColor(C.inkMuted)
      .text('Amount in Words', left + 14, y + 9, { lineBreak: false });
    doc
      .font('Helvetica-Bold')
      .fontSize(10)
      .fillColor(C.ink)
      .text(
        amountInWords(data.paymentAmount.toDecimalString(), { currency: company.currency }),
        left + 14,
        y + 22,
        { width: width - 220, lineBreak: false, ellipsis: true },
      );

    doc
      .moveTo(left + width - 196, y + 8)
      .lineTo(left + width - 196, y + wordsHeight - 8)
      .lineWidth(0.5)
      .strokeColor(C.pinkBorder)
      .stroke();
    doc
      .font('Helvetica-Oblique')
      .fontSize(8)
      .fillColor(C.inkMuted)
      .text(
        'Your trust motivates us to achieve greater heights together.',
        left + width - 184,
        y + 13,
        { width: 170 },
      );

    y += wordsHeight + 16;

    if (payment.notes) {
      doc.font('Helvetica-Bold').fontSize(8).fillColor(C.inkMuted).text('Notes', left, y, {
        lineBreak: false,
      });
      doc
        .font('Helvetica')
        .fontSize(8.5)
        .fillColor(C.inkMuted)
        .text(payment.notes, left, y + 11, { width: width * 0.6 });
      y = Math.max(y + 26, doc.y + 8);
    }

    // ── Thank you + signature ────────────────────────────────
    // Anchored just above the footer rather than flowing after the content, so
    // the sheet does not end with a large band of empty paper between the
    // signature and the footer rule.
    const footerRuleY = doc.page.height - PAGE_MARGIN - 20 - 46;
    y = Math.max(y, footerRuleY - 82);

    doc
      .font('Helvetica-BoldOblique')
      .fontSize(18)
      .fillColor(C.red)
      .text('Thank You!', left, y, { lineBreak: false });
    doc
      .font('Helvetica')
      .fontSize(8.5)
      .fillColor(C.inkMuted)
      .text('for being a valued partner.', left, y + 23, { lineBreak: false })
      .text('We look forward to a continued successful relationship.', left, y + 34, {
        lineBreak: false,
      });

    const signWidth = 190;
    const signX = left + width - signWidth;
    doc
      .font('Helvetica')
      .fontSize(8)
      .fillColor(C.inkMuted)
      .text('Generated By:', signX, y, { width: signWidth, align: 'right', lineBreak: false });
    doc
      .font('Helvetica-Bold')
      .fontSize(10)
      .fillColor(C.ink)
      .text(data.generatedByName ?? '—', signX, y + 11, {
        width: signWidth,
        align: 'right',
        lineBreak: false,
      });
    doc
      .font('Helvetica-BoldOblique')
      .fontSize(14)
      .fillColor(C.ink)
      .text(brandWord, signX, y + 29, { width: signWidth, align: 'right', lineBreak: false });
    doc
      .moveTo(signX + 40, y + 47)
      .lineTo(signX + signWidth, y + 47)
      .lineWidth(0.7)
      .strokeColor(C.ink)
      .stroke();
    doc
      .font('Helvetica')
      .fontSize(8)
      .fillColor(C.inkMuted)
      .text(company.authorizedSignatory || `${companyName} Accounts Team`, signX, y + 51, {
        width: signWidth,
        align: 'right',
        lineBreak: false,
      });

    // ── Footer, pinned to the bottom of the sheet ────────────
    this.drawFooter(doc, company, companyName, receipt.receiptDate);

    doc.end();
    return doc;
  }

  // ── section helpers ────────────────────────────────────────

  private drawFooter(
    doc: PDFKit.PDFDocument,
    company: CompanySetting,
    companyName: string,
    receiptDate: string,
  ): void {
    const left = PAGE_MARGIN;
    const width = doc.page.width - PAGE_MARGIN * 2;
    const barHeight = 20;
    const barY = doc.page.height - PAGE_MARGIN - barHeight;
    const footerY = barY - 46;

    doc
      .moveTo(left, footerY)
      .lineTo(left + width, footerY)
      .lineWidth(0.5)
      .strokeColor(C.line)
      .stroke();

    const address = [company.city, company.state, company.country].filter(Boolean).join(', ');
    doc
      .font('Helvetica-Bold')
      .fontSize(8)
      .fillColor(C.ink)
      .text(companyName, left, footerY + 10, { lineBreak: false });
    if (address) {
      doc
        .font('Helvetica')
        .fontSize(7.5)
        .fillColor(C.inkMuted)
        .text(address, left, footerY + 21, { lineBreak: false });
    }

    const contact = [company.website, company.email, company.phone].filter(Boolean).join('   ·   ');
    if (contact) {
      doc
        .font('Helvetica')
        .fontSize(7.5)
        .fillColor(C.inkMuted)
        .text(contact, left + 160, footerY + 15, { width: width - 290, lineBreak: false });
    }

    doc
      .font('Helvetica')
      .fontSize(7.5)
      .fillColor(C.inkMuted)
      .text('Build  ·  Innovate', left + width - 120, footerY + 10, {
        width: 120,
        align: 'right',
        lineBreak: false,
      });
    doc
      .font('Helvetica-Bold')
      .fillColor(C.red)
      .text('Grow Together', left + width - 120, footerY + 21, {
        width: 120,
        align: 'right',
        lineBreak: false,
      });

    // Bottom brand bar.
    doc.rect(left, barY, width, barHeight).fill(C.redDark);
    const year = new Date(receiptDate).getFullYear() || new Date().getFullYear();
    doc
      .font('Helvetica')
      .fontSize(7.5)
      .fillColor(C.white)
      .text(`(c) ${year} ${companyName}. All rights reserved.`, left + 12, barY + 7, {
        lineBreak: false,
      });
    // Wide enough for the letterspaced text: too narrow and pdfkit wraps it
    // onto a second line that falls outside the bar.
    doc.text('PEOPLE  |  TECHNOLOGY  |  GROWTH', left + width - 212, barY + 7, {
      width: 200,
      align: 'right',
      characterSpacing: 0.6,
      lineBreak: false,
    });

    if (company.receiptFooterNote) {
      doc
        .font('Helvetica')
        .fontSize(7)
        .fillColor(C.inkSubtle)
        .text(company.receiptFooterNote, left, footerY - 12, { width, align: 'center' });
    }
  }

  private infoCard(
    doc: PDFKit.PDFDocument,
    x: number,
    y: number,
    boxWidth: number,
    boxHeight: number,
    label: string,
    title: string,
    lines: string[],
    glyph: 'person' | 'folder',
  ): void {
    this.roundedRect(doc, x, y, boxWidth, boxHeight, 8).lineWidth(0.6).strokeColor(C.line).stroke();
    this.roundedRect(doc, x + 12, y + 13, 26, 26, 6).fill(C.pinkSurface);
    this.glyph(doc, glyph, x + 19, y + 20, 12);

    const textX = x + 48;
    const textWidth = boxWidth - 60;
    doc
      .font('Helvetica-Bold')
      .fontSize(7.5)
      .fillColor(C.red)
      .text(label, textX, y + 12, { characterSpacing: 0.8, width: textWidth, lineBreak: false });
    doc
      .font('Helvetica-Bold')
      .fontSize(10.5)
      .fillColor(C.ink)
      .text(title, textX, y + 22, { width: textWidth, lineBreak: false, ellipsis: true });

    let lineY = y + 37;
    doc.font('Helvetica').fontSize(8).fillColor(C.inkMuted);
    for (const line of lines) {
      doc.text(line, textX, lineY, { width: textWidth, lineBreak: false, ellipsis: true });
      lineY += 11;
    }
  }

  private metaRow(
    doc: PDFKit.PDFDocument,
    x: number,
    y: number,
    label: string,
    value: string,
    glyph: 'document' | 'calendar',
  ): void {
    this.roundedRect(doc, x, y, 22, 22, 5).fill(C.white);
    this.glyph(doc, glyph, x + 6, y + 6, 10);
    doc
      .font('Helvetica')
      .fontSize(7.5)
      .fillColor(C.inkMuted)
      .text(label, x + 30, y + 2, { lineBreak: false });
    doc
      .font('Helvetica-Bold')
      .fontSize(11)
      .fillColor(C.red)
      .text(value, x + 30, y + 11, { lineBreak: false });
  }

  /**
   * Minimal line-art glyphs for the icon badges. pdfkit cannot render an icon
   * font or SVG sprite, and an empty pink square reads as a broken image, so
   * each badge draws its own primitive.
   */
  private glyph(
    doc: PDFKit.PDFDocument,
    kind: 'document' | 'calendar' | 'person' | 'folder',
    x: number,
    y: number,
    size: number,
  ): void {
    doc.save();
    doc
      .lineWidth(size * 0.09)
      .strokeColor(C.red)
      .fillColor(C.red);
    const s = size;

    if (kind === 'document') {
      doc.roundedRect(x + s * 0.15, y, s * 0.7, s, s * 0.12).stroke();
      doc
        .moveTo(x + s * 0.3, y + s * 0.32)
        .lineTo(x + s * 0.7, y + s * 0.32)
        .moveTo(x + s * 0.3, y + s * 0.52)
        .lineTo(x + s * 0.7, y + s * 0.52)
        .moveTo(x + s * 0.3, y + s * 0.72)
        .lineTo(x + s * 0.55, y + s * 0.72)
        .stroke();
    } else if (kind === 'calendar') {
      doc.roundedRect(x, y + s * 0.15, s, s * 0.85, s * 0.12).stroke();
      doc
        .moveTo(x, y + s * 0.42)
        .lineTo(x + s, y + s * 0.42)
        .moveTo(x + s * 0.28, y)
        .lineTo(x + s * 0.28, y + s * 0.28)
        .moveTo(x + s * 0.72, y)
        .lineTo(x + s * 0.72, y + s * 0.28)
        .stroke();
    } else if (kind === 'person') {
      doc.circle(x + s * 0.5, y + s * 0.3, s * 0.22).stroke();
      doc
        .moveTo(x + s * 0.12, y + s)
        .quadraticCurveTo(x + s * 0.5, y + s * 0.55, x + s * 0.88, y + s)
        .stroke();
    } else {
      doc
        .moveTo(x, y + s * 0.9)
        .lineTo(x, y + s * 0.15)
        .lineTo(x + s * 0.4, y + s * 0.15)
        .lineTo(x + s * 0.52, y + s * 0.35)
        .lineTo(x + s, y + s * 0.35)
        .lineTo(x + s, y + s * 0.9)
        .closePath()
        .stroke();
    }

    doc.restore();
  }

  /** Angular corner accent, mirroring the on-screen decoration. */
  private drawCornerDecoration(doc: PDFKit.PDFDocument): void {
    const right = doc.page.width;
    doc.save();
    doc
      .polygon([right, 0], [right, 46], [right - 46, 0])
      .fillOpacity(0.95)
      .fill(C.red);
    doc
      .polygon([right, 52], [right, 90], [right - 38, 52])
      .fillOpacity(0.3)
      .fill(C.red);
    doc
      .polygon([right - 56, 0], [right - 18, 0], [right - 56, 38])
      .fillOpacity(0.15)
      .fill(C.red);
    doc.restore();
    doc.fillOpacity(1);
  }

  /** pdfkit has no rounded-rect primitive with selectively rounded corners. */
  private roundedRect(
    doc: PDFKit.PDFDocument,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number,
    corners: { top?: boolean; bottom?: boolean } = {},
  ): PDFKit.PDFDocument {
    const top = corners.top !== false;
    const bottom = corners.bottom !== false;

    doc.moveTo(x + (top ? r : 0), y);
    doc.lineTo(x + w - (top ? r : 0), y);
    if (top) doc.quadraticCurveTo(x + w, y, x + w, y + r);
    doc.lineTo(x + w, y + h - (bottom ? r : 0));
    if (bottom) doc.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    doc.lineTo(x + (bottom ? r : 0), y + h);
    if (bottom) doc.quadraticCurveTo(x, y + h, x, y + h - r);
    doc.lineTo(x, y + (top ? r : 0));
    if (top) doc.quadraticCurveTo(x, y, x + r, y);
    doc.closePath();
    return doc;
  }

  /**
   * pdfkit's built-in Helvetica uses WinAnsi encoding, which has no glyph for
   * the rupee sign (U+20B9) — printing it produces a stray character on the
   * paper receipt. Rather than ship a binary font for one glyph, any symbol
   * outside WinAnsi falls back to the ISO currency code, which is unambiguous
   * and matches what the on-screen receipt prints.
   */
  private printableCurrency(company: CompanySetting): string {
    const symbol = company.currencySymbol || '';
    const printable = symbol !== '' && [...symbol].every((char) => char.charCodeAt(0) <= 0xff);
    return printable ? symbol : company.currency || 'INR';
  }

  /** Groups digits so a five- or seven-figure amount is readable on paper. */
  private money(symbol: string, amount: Money): string {
    const [whole, fraction = ''] = amount.toDecimalString().split('.');
    const negative = whole.startsWith('-');
    const digits = negative ? whole.slice(1) : whole;

    // Indian grouping: last three digits, then pairs (12,34,567).
    const grouped =
      digits.length > 3
        ? `${digits.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',')},${digits.slice(-3)}`
        : digits;

    return `${symbol} ${negative ? '-' : ''}${grouped}${fraction ? `.${fraction}` : ''}`;
  }

  private resolveLogo(): string | null {
    const candidates = [
      join(process.cwd(), 'assets', 'brand', 'devstree-logo.png'),
      join(__dirname, '..', '..', '..', '..', 'assets', 'brand', 'devstree-logo.png'),
    ];
    const found = candidates.find((path) => existsSync(path));
    if (!found) {
      this.logger.warn(
        'Devstree logo not found at assets/brand/devstree-logo.png — receipts will print a text wordmark instead.',
      );
      return null;
    }
    return found;
  }

  private formatDate(value: string): string {
    return new Date(value).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }
}
