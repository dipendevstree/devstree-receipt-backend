"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReceiptPdfService = void 0;
const common_1 = require("@nestjs/common");
const pdfkit_1 = __importDefault(require("pdfkit"));
const amount_in_words_util_1 = require("../../../common/utils/amount-in-words.util");
const PAYMENT_METHOD_LABELS = {
    BANK_TRANSFER: 'Bank Transfer',
    UPI: 'UPI',
    CHEQUE: 'Cheque',
    CASH: 'Cash',
    CREDIT_CARD: 'Credit Card',
    OTHER: 'Other',
};
let ReceiptPdfService = class ReceiptPdfService {
    render(data) {
        const doc = new pdfkit_1.default({ size: 'A4', margin: 50 });
        const { receipt, payment, company } = data;
        const currencySymbol = company.currencySymbol || '₹';
        doc
            .font('Helvetica-Bold')
            .fontSize(20)
            .fillColor('#9e122f')
            .text(company.companyName || 'Devstree', { align: 'center' });
        doc
            .font('Helvetica')
            .fontSize(11)
            .fillColor('#333333')
            .text('PAYMENT RECEIPT', { align: 'center' });
        doc.moveDown(0.3);
        const companyLines = [
            company.address,
            [company.city, company.state, company.postalCode].filter(Boolean).join(', '),
            company.country,
        ]
            .filter(Boolean)
            .join(' · ');
        if (companyLines) {
            doc.fontSize(9).fillColor('#666666').text(companyLines, { align: 'center' });
        }
        if (company.taxNumber) {
            doc.fontSize(9).text(`GSTIN/Tax No: ${company.taxNumber}`, { align: 'center' });
        }
        doc.moveDown(1);
        this.hr(doc);
        doc.moveDown(0.5);
        doc.fontSize(10).fillColor('#000000');
        this.row(doc, 'Receipt No.', receipt.receiptNumber, 'Receipt Date', this.formatDate(receipt.receiptDate));
        doc.moveDown(1);
        doc.font('Helvetica-Bold').fontSize(10).text('CLIENT');
        doc.font('Helvetica').text(payment.client?.name ?? '');
        if (payment.client?.companyName)
            doc.text(payment.client.companyName);
        if (payment.client?.email)
            doc.text(payment.client.email);
        doc.moveDown(0.8);
        doc.font('Helvetica-Bold').text('PROJECT');
        doc.font('Helvetica').text(payment.project?.projectName ?? '');
        doc.text(`Project Code: ${payment.project?.projectCode ?? ''}`);
        doc.moveDown(1);
        this.hr(doc);
        doc.moveDown(0.5);
        this.amountRow(doc, 'Payment Amount', `${currencySymbol} ${data.paymentAmount.toDecimalString()}`, true);
        this.amountRow(doc, 'Payment Method', PAYMENT_METHOD_LABELS[payment.paymentMethod] ?? payment.paymentMethod);
        if (payment.transactionReference) {
            this.amountRow(doc, 'Transaction Reference', payment.transactionReference);
        }
        if (payment.bankAccount) {
            this.amountRow(doc, 'Bank / Account', payment.bankAccount);
        }
        doc.moveDown(0.5);
        this.hr(doc);
        doc.moveDown(0.5);
        this.amountRow(doc, 'Project Amount', `${currencySymbol} ${data.projectAmount.toDecimalString()}`);
        this.amountRow(doc, 'Total Received', `${currencySymbol} ${data.totalReceived.toDecimalString()}`);
        this.amountRow(doc, 'Remaining Due', `${currencySymbol} ${data.dueAmount.toDecimalString()}`, true);
        doc.moveDown(1);
        doc.font('Helvetica-Bold').fontSize(10).text('Amount in Words');
        doc
            .font('Helvetica-Oblique')
            .fontSize(10)
            .text((0, amount_in_words_util_1.amountInWords)(data.paymentAmount.toDecimalString(), { currency: company.currency }));
        if (payment.notes) {
            doc.moveDown(0.8);
            doc.font('Helvetica-Bold').fontSize(10).text('Notes');
            doc.font('Helvetica').fontSize(10).text(payment.notes);
        }
        doc.moveDown(1.5);
        this.hr(doc);
        doc.moveDown(2);
        doc.font('Helvetica').fontSize(10).text('_____________________________', { align: 'right' });
        doc.text(company.authorizedSignatory || 'Authorized Signatory', { align: 'right' });
        doc.text(company.companyName || 'Devstree', { align: 'right' });
        if (company.receiptFooterNote) {
            doc.moveDown(1);
            doc.fontSize(8).fillColor('#888888').text(company.receiptFooterNote, { align: 'center' });
        }
        doc.end();
        return doc;
    }
    hr(doc) {
        const { left, right } = doc.page.margins;
        const width = doc.page.width - left - right;
        doc
            .moveTo(doc.x, doc.y)
            .lineTo(doc.x + width, doc.y)
            .strokeColor('#dddddd')
            .stroke();
    }
    row(doc, labelA, valueA, labelB, valueB) {
        const startX = doc.x;
        const y = doc.y;
        const halfWidth = (doc.page.width - doc.page.margins.left - doc.page.margins.right) / 2;
        doc
            .font('Helvetica-Bold')
            .text(`${labelA}: `, startX, y, { continued: true })
            .font('Helvetica')
            .text(valueA);
        doc
            .font('Helvetica-Bold')
            .text(`${labelB}: `, startX + halfWidth, y, { continued: true })
            .font('Helvetica')
            .text(valueB);
    }
    amountRow(doc, label, value, bold = false) {
        const startX = doc.x;
        const y = doc.y;
        const width = doc.page.width - doc.page.margins.left - doc.page.margins.right;
        doc
            .font(bold ? 'Helvetica-Bold' : 'Helvetica')
            .fontSize(10)
            .text(label, startX, y, { continued: false });
        doc
            .font(bold ? 'Helvetica-Bold' : 'Helvetica')
            .fontSize(10)
            .text(value, startX, y, {
            width,
            align: 'right',
        });
        doc.moveDown(0.4);
    }
    formatDate(value) {
        return new Date(value).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
        });
    }
};
exports.ReceiptPdfService = ReceiptPdfService;
exports.ReceiptPdfService = ReceiptPdfService = __decorate([
    (0, common_1.Injectable)()
], ReceiptPdfService);
//# sourceMappingURL=receipt-pdf.service.js.map