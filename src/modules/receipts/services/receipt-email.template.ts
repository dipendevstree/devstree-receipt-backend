import { CompanySetting } from '../../settings/entities/company-setting.entity';
import { ReceiptResponseDto } from '../dto/receipt.dto';

/**
 * The transactional "payment receipt" email.
 *
 * Written as email HTML, which is not web HTML. The rules that shape every
 * decision below:
 *
 *   • Layout is nested `<table>` — Outlook (Word rendering engine) has no
 *     flexbox or grid, and `div` + `float` collapses there.
 *   • Every style is inline. Gmail strips `<style>` blocks on the mobile web
 *     client, so anything that MUST hold has to be on the element.
 *   • The one `<style>` block carries only the mobile media query. A client
 *     that drops it still gets the readable 600px desktop layout, so the
 *     stacking is an enhancement rather than a dependency.
 *   • No web fonts, no background-image, no `position`, no shorthand
 *     `background:` (Outlook ignores it) — `bgcolor` plus `background-color`.
 *   • Colours are the same tokens the printed receipt and the PDF use, so a
 *     client who sees all three sees one document.
 *
 * The financial-lock rules of the rest of the app apply unchanged: a masked
 * amount arrives here already masked, and this file never unmasks anything.
 */

/** Same palette as `receipt-document.tsx` and the PDF service. */
const BRAND = {
  red: '#e11d3d',
  redDark: '#a8102e',
  redDeep: '#7a0b22',
  ink: '#101828',
  inkMuted: '#5c6575',
  inkSubtle: '#98a1b0',
  pinkSurface: '#fdf2f5',
  pinkBorder: '#f7d9e1',
  line: '#e8ecf2',
  paper: '#f4f6fa',
} as const;

const FONT =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";

/** Anything interpolated into the markup goes through here first. */
function esc(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export interface ReceiptEmailOptions {
  /**
   * How the logo reaches the inbox. Left to the caller on purpose: a `cid:`
   * reference needs a matching attachment on the message, and a hosted URL
   * needs a public origin — neither is this template's decision to make.
   * When omitted the header falls back to the company name set in Settings,
   * which is the same fallback the PDF service already uses.
   */
  logoSrc?: string | null;
  /** Optional absolute link back to the receipt in the admin panel. */
  receiptUrl?: string | null;
}

export interface RenderedEmail {
  subject: string;
  html: string;
  /** Plain-text alternative. Never omit it — it is what spam filters read. */
  text: string;
}

/** A label/value line inside the payment panel. */
function detailRow(
  label: string,
  value: string,
  opts?: { strong?: boolean; last?: boolean },
): string {
  const border = opts?.last ? 'none' : `1px solid ${BRAND.line}`;
  const valueStyle = opts?.strong
    ? `font-size:18px;font-weight:700;color:${BRAND.red};`
    : `font-size:14px;font-weight:600;color:${BRAND.ink};`;
  return `
    <tr>
      <td style="padding:12px 0;border-bottom:${border};font-family:${FONT};font-size:13px;color:${BRAND.inkMuted};" width="45%" align="left" valign="top">${esc(label)}</td>
      <td style="padding:12px 0;border-bottom:${border};font-family:${FONT};${valueStyle}" align="right" valign="top">${esc(value)}</td>
    </tr>`;
}

/** One of the two side-by-side cards (Client / Project). */
function infoCard(heading: string, lines: Array<string | null | undefined>): string {
  const body = lines
    .filter((line): line is string => Boolean(line && line.trim()))
    .map(
      (line, index) =>
        `<div style="font-family:${FONT};font-size:${index === 0 ? '15px' : '13px'};font-weight:${
          index === 0 ? '700' : '400'
        };color:${index === 0 ? BRAND.ink : BRAND.inkMuted};line-height:1.5;${
          index === 0 ? '' : 'margin-top:2px;'
        }">${esc(line)}</div>`,
    )
    .join('');

  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" height="100%" style="border-collapse:collapse;height:100%;">
      <tr>
        <td bgcolor="${BRAND.pinkSurface}" valign="top" style="background-color:${BRAND.pinkSurface};border:1px solid ${BRAND.pinkBorder};border-radius:10px;padding:16px 18px;height:100%;">
          <div style="font-family:${FONT};font-size:11px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;color:${BRAND.red};padding-bottom:8px;">${esc(heading)}</div>
          ${body}
        </td>
      </tr>
    </table>`;
}

export function renderReceiptEmail(
  receipt: ReceiptResponseDto,
  company: CompanySetting,
  options: ReceiptEmailOptions = {},
): RenderedEmail {
  const symbol = company.currencySymbol || '₹';
  const companyName = company.companyName || 'Devstree';

  /**
   * Amounts arrive from the API already formatted or already masked. A masked
   * value must be printed exactly as received — re-formatting it would leak
   * the shape of the number it is hiding.
   */
  const money = (value: string | null): string =>
    value === null || value === undefined || value === '' ? '—' : `${symbol} ${value}`;

  /**
   * The rule the whole system turns on: a project with no agreed amount is
   * NOT a zero-value project. It shows "Not Defined", and its due is "N/A" —
   * never "₹0", and never a due figure invented from a missing total.
   */
  const projectAmountText = receipt.hasProjectAmount ? money(receipt.projectAmount) : 'Not Defined';
  const dueText = receipt.hasProjectAmount ? money(receipt.projectDueAmount) : 'N/A';

  const receiptNo = receipt.receiptNumber ?? '';
  const subject = `Payment Receipt ${receiptNo} — ${companyName}`;

  const addressLine = [
    company.address,
    company.city,
    company.state,
    company.postalCode,
    company.country,
  ]
    .filter((part) => part && String(part).trim())
    .join(', ');

  const logoBlock = options.logoSrc
    ? `<img src="${esc(options.logoSrc)}" alt="${esc(companyName)}" height="34" style="display:block;border:0;outline:none;text-decoration:none;height:34px;width:auto;" />`
    : `<div style="font-family:${FONT};font-size:22px;font-weight:700;letter-spacing:-0.4px;color:#ffffff;">${esc(companyName)}</div>`;

  const html = `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="x-apple-disable-message-reformatting" />
<title>${esc(subject)}</title>
<style type="text/css">
  /* Enhancement only — a client that strips this still gets the 600px layout. */
  @media only screen and (max-width:620px) {
    .wrap { width:100% !important; }
    .px { padding-left:20px !important; padding-right:20px !important; }
    /* Only the receipt-no / date pair stacks; the payment rows stay two-column
       so each label keeps its value beside it. */
    .stack { display:block !important; width:100% !important; text-align:left !important; }
    .stack-right { text-align:left !important; padding-top:10px !important; }
    .col { display:block !important; width:100% !important; padding:0 0 12px 0 !important; }
    .hero-no { font-size:24px !important; }
  }
  /* Stop iOS turning dates and reference codes into blue links. */
  a[x-apple-data-detectors] { color:inherit !important; text-decoration:none !important; }
</style>
</head>
<body style="margin:0;padding:0;background-color:${BRAND.paper};" bgcolor="${BRAND.paper}">

<!-- Preheader: the grey line the inbox shows after the subject. -->
<div style="display:none;font-size:1px;color:${BRAND.paper};line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">
  Receipt ${esc(receiptNo)} — payment of ${esc(money(receipt.amount))} received. Thank you.
</div>

<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" bgcolor="${BRAND.paper}" style="background-color:${BRAND.paper};">
  <tr>
    <td align="center" style="padding:24px 12px;">

      <table role="presentation" class="wrap" cellpadding="0" cellspacing="0" border="0" width="600" style="width:600px;max-width:600px;background-color:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 1px 3px rgba(16,24,40,0.08);">

        <!-- ── Header ─────────────────────────────────────────── -->
        <tr>
          <td bgcolor="${BRAND.red}" style="background-color:${BRAND.red};padding:26px 32px;" class="px">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
              <tr>
                <td align="left" valign="middle">${logoBlock}</td>
              </tr>
              <tr>
                <td align="left" style="padding-top:20px;">
                  <div style="font-family:${FONT};font-size:26px;font-weight:700;letter-spacing:-0.5px;color:#ffffff;line-height:1.2;">Payment Receipt</div>
                  <div style="font-family:${FONT};font-size:13px;color:rgba(255,255,255,0.82);padding-top:6px;">Thank you for your payment. We appreciate your trust in ${esc(companyName)}.</div>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- ── Receipt number + date ──────────────────────────── -->
        <tr>
          <td bgcolor="${BRAND.redDeep}" style="background-color:${BRAND.redDeep};padding:14px 32px;" class="px">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
              <tr>
                <td class="stack" align="left" valign="middle" width="50%">
                  <div style="font-family:${FONT};font-size:11px;letter-spacing:1px;text-transform:uppercase;color:rgba(255,255,255,0.7);">Receipt No.</div>
                  <div class="hero-no" style="font-family:${FONT};font-size:20px;font-weight:700;color:#ffffff;padding-top:2px;">${esc(receiptNo)}</div>
                </td>
                <td class="stack stack-right" align="right" valign="middle" width="50%">
                  <div style="font-family:${FONT};font-size:11px;letter-spacing:1px;text-transform:uppercase;color:rgba(255,255,255,0.7);">Receipt Date</div>
                  <div style="font-family:${FONT};font-size:15px;font-weight:600;color:#ffffff;padding-top:2px;">${esc(receipt.receiptDate ?? '')}</div>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- ── Client / Project ───────────────────────────────── -->
        <tr>
          <td style="padding:26px 32px 6px 32px;" class="px">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
              <tr>
                <td class="col" width="50%" valign="top" height="100%" style="padding-right:8px;height:100%;">
                  ${infoCard('Client', [
                    receipt.clientName,
                    receipt.clientEmail,
                    receipt.clientPhone,
                  ])}
                </td>
                <td class="col" width="50%" valign="top" height="100%" style="padding-left:8px;height:100%;">
                  ${infoCard('Project', [
                    receipt.projectName,
                    receipt.projectCode ? `Project Code: ${receipt.projectCode}` : null,
                  ])}
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- ── Payment details ────────────────────────────────── -->
        <tr>
          <td style="padding:20px 32px 0 32px;" class="px">
            <div style="font-family:${FONT};font-size:11px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;color:${BRAND.red};padding-bottom:4px;">Payment Details</div>
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;">
              ${detailRow('Payment Amount', money(receipt.amount), { strong: true })}
              ${detailRow('Payment Method', receipt.paymentMethod ?? '—')}
              ${detailRow('Payment Date', receipt.paymentDate ?? '—')}
              ${detailRow('Transaction Reference', receipt.transactionReference ?? '—')}
              ${detailRow('Project Amount', projectAmountText)}
              ${detailRow('Total Received', money(receipt.projectTotalReceived))}
              ${detailRow('Remaining Due', dueText, { last: true })}
            </table>
          </td>
        </tr>

        <!-- ── Amount in words ────────────────────────────────── -->
        ${
          receipt.amountInWords
            ? `<tr>
          <td style="padding:20px 32px 0 32px;" class="px">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
              <tr>
                <td bgcolor="${BRAND.pinkSurface}" style="background-color:${BRAND.pinkSurface};border-left:3px solid ${BRAND.red};border-radius:0 10px 10px 0;padding:14px 18px;">
                  <div style="font-family:${FONT};font-size:11px;letter-spacing:1px;text-transform:uppercase;color:${BRAND.inkMuted};">Amount in Words</div>
                  <div style="font-family:${FONT};font-size:15px;font-weight:700;color:${BRAND.ink};padding-top:3px;">${esc(receipt.amountInWords)}</div>
                </td>
              </tr>
            </table>
          </td>
        </tr>`
            : ''
        }

        <!-- ── Optional link back to the receipt ──────────────── -->
        ${
          options.receiptUrl
            ? `<tr>
          <td align="center" style="padding:26px 32px 0 32px;" class="px">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td align="center" bgcolor="${BRAND.red}" style="background-color:${BRAND.red};border-radius:8px;">
                  <a href="${esc(options.receiptUrl)}" target="_blank" style="display:inline-block;padding:13px 30px;font-family:${FONT};font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;">View Receipt</a>
                </td>
              </tr>
            </table>
          </td>
        </tr>`
            : ''
        }

        <!-- ── Generated by ───────────────────────────────────── -->
        <tr>
          <td style="padding:26px 32px 0 32px;" class="px">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-top:1px solid ${BRAND.line};">
              <tr>
                <td style="padding-top:14px;">
                  <div style="font-family:${FONT};font-size:11px;letter-spacing:1px;text-transform:uppercase;color:${BRAND.inkSubtle};">Generated By</div>
                  <div style="font-family:${FONT};font-size:14px;font-weight:600;color:${BRAND.ink};padding-top:2px;">${esc(receipt.generatedByName ?? '—')}</div>
                </td>
              </tr>
              ${
                company.receiptFooterNote
                  ? `<tr><td style="padding-top:12px;"><div style="font-family:${FONT};font-size:12px;color:${BRAND.inkMuted};line-height:1.6;">${esc(company.receiptFooterNote)}</div></td></tr>`
                  : ''
              }
            </table>
          </td>
        </tr>

        <!-- ── Footer ─────────────────────────────────────────── -->
        <tr>
          <td bgcolor="${BRAND.pinkSurface}" style="background-color:${BRAND.pinkSurface};border-top:1px solid ${BRAND.pinkBorder};padding:22px 32px;margin-top:26px;" class="px">
            <div style="font-family:${FONT};font-size:14px;font-weight:700;color:${BRAND.ink};">${esc(companyName)}</div>
            ${addressLine ? `<div style="font-family:${FONT};font-size:12px;color:${BRAND.inkMuted};padding-top:4px;line-height:1.6;">${esc(addressLine)}</div>` : ''}
            <div style="font-family:${FONT};font-size:12px;color:${BRAND.inkMuted};padding-top:6px;line-height:1.7;">
              ${company.website ? `<a href="${esc(company.website.startsWith('http') ? company.website : `https://${company.website}`)}" style="color:${BRAND.redDark};text-decoration:none;">${esc(company.website)}</a>` : ''}
              ${company.website && company.email ? ' &nbsp;·&nbsp; ' : ''}
              ${company.email ? `<a href="mailto:${esc(company.email)}" style="color:${BRAND.redDark};text-decoration:none;">${esc(company.email)}</a>` : ''}
              ${(company.website || company.email) && company.phone ? ' &nbsp;·&nbsp; ' : ''}
              ${company.phone ? esc(company.phone) : ''}
            </div>
            ${company.taxNumber ? `<div style="font-family:${FONT};font-size:11px;color:${BRAND.inkSubtle};padding-top:8px;">Tax No: ${esc(company.taxNumber)}</div>` : ''}
          </td>
        </tr>

      </table>

      <div style="font-family:${FONT};font-size:11px;color:${BRAND.inkSubtle};padding-top:16px;text-align:center;line-height:1.6;">
        This is a computer-generated receipt confirmation.
      </div>

    </td>
  </tr>
</table>

</body>
</html>`;

  /**
   * The plain-text part. Not a nicety: a message with no text/plain
   * alternative scores worse with spam filters, and some corporate clients
   * display it in preference to the HTML.
   */
  const text = [
    `${companyName} — Payment Receipt`,
    '',
    `Receipt No:   ${receiptNo}`,
    `Receipt Date: ${receipt.receiptDate ?? ''}`,
    '',
    `Client:  ${receipt.clientName}`,
    `Project: ${receipt.projectName}${receipt.projectCode ? ` [${receipt.projectCode}]` : ''}`,
    '',
    'PAYMENT DETAILS',
    `  Payment Amount:        ${money(receipt.amount)}`,
    `  Payment Method:        ${receipt.paymentMethod ?? '—'}`,
    `  Payment Date:          ${receipt.paymentDate ?? '—'}`,
    `  Transaction Reference: ${receipt.transactionReference ?? '—'}`,
    `  Project Amount:        ${projectAmountText}`,
    `  Total Received:        ${money(receipt.projectTotalReceived)}`,
    `  Remaining Due:         ${dueText}`,
    '',
    receipt.amountInWords ? `Amount in Words: ${receipt.amountInWords}` : '',
    '',
    `Generated By: ${receipt.generatedByName ?? '—'}`,
    '',
    'Thank you for your payment.',
    addressLine ? `\n${companyName}\n${addressLine}` : `\n${companyName}`,
    [company.website, company.email, company.phone].filter(Boolean).join('  ·  '),
  ]
    .filter((line) => line !== '')
    .join('\n');

  return { subject, html, text };
}
