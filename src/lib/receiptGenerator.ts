import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';

interface ReceiptItem {
    name: string;
    qty: number;
    price: number;
    discount?: number;
    total: number;
}

interface ReceiptData {
    orderId: string;
    date: Date;
    customer: string;
    cashier: string;
    items: ReceiptItem[];
    subtotal: number;
    discountTotal: number;
    taxTotal: number;
    grandTotal: number;
    amountPaid: number;
    change: number;
    paymentMethod: string;
    storeProfile?: {
        name?: string;
        address?: string;
        phone?: string;
    };
}

export const generateReceiptPDF = (data: ReceiptData) => {
    const doc = new jsPDF({
        unit: 'mm',
        format: [80, 200] // Standard thermal receipt size (80mm width)
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const centerX = pageWidth / 2;

    // Header
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(data.storeProfile?.name || 'TUNFLOW MARKET', centerX, 10, { align: 'center' });

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    if (data.storeProfile?.address) {
        doc.text(data.storeProfile.address, centerX, 15, { align: 'center', maxWidth: 70 });
    } else {
        doc.text('123 Ocean Drive, General Santos City', centerX, 15, { align: 'center' });
    }

    doc.text('VAT REG: 123-456-789-000', centerX, 22, { align: 'center' });
    doc.text(`Phone: ${data.storeProfile?.phone || '(083) 552-4141'}`, centerX, 26, { align: 'center' });

    doc.line(5, 29, pageWidth - 5, 29);

    // Order Info
    doc.setFontSize(7);
    doc.text(`OR #: ${data.orderId}`, 5, 33);
    doc.text(`DATE: ${format(data.date, 'MM/dd/yyyy HH:mm')}`, 5, 37);
    doc.text(`CASHIER: ${data.cashier}`, 5, 41);
    doc.text(`CUSTOMER: ${data.customer}`, 5, 45);
    doc.text(`METHOD: ${data.paymentMethod.toUpperCase()}`, 5, 49);

    doc.line(5, 52, pageWidth - 5, 52);

    // Items Table
    const tableBody = data.items.map(item => [
        item.name,
        item.qty.toString(),
        item.price.toFixed(2),
        item.total.toFixed(2)
    ]);

    autoTable(doc, {
        startY: 55,
        head: [['ITEM', 'QTY', 'PRICE', 'TOTAL']],
        body: tableBody,
        theme: 'plain',
        styles: { fontSize: 7, cellPadding: 1 },
        headStyles: { fontStyle: 'bold', fillColor: [240, 240, 240] },
        columns: [
            { header: 'ITEM', dataKey: 0 },
            { header: 'QTY', dataKey: 1 },
            { header: 'PRICE', dataKey: 2 },
            { header: 'TOTAL', dataKey: 3 },
        ],
        margin: { left: 5, right: 5 }
    });

    const finalY = (doc as any).lastAutoTable.finalY + 5;

    // Totals
    doc.setFont('helvetica', 'normal');
    doc.text('SUBTOTAL:', pageWidth - 35, finalY);
    doc.text(`P${data.subtotal.toFixed(2)}`, pageWidth - 5, finalY, { align: 'right' });

    doc.text('DISCOUNT:', pageWidth - 35, finalY + 4);
    doc.text(`-P${data.discountTotal.toFixed(2)}`, pageWidth - 5, finalY + 4, { align: 'right' });

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('TOTAL:', pageWidth - 35, finalY + 10);
    doc.text(`P${data.grandTotal.toFixed(2)}`, pageWidth - 5, finalY + 10, { align: 'right' });

    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text('TENDERED:', pageWidth - 35, finalY + 16);
    doc.text(`P${data.amountPaid.toFixed(2)}`, pageWidth - 5, finalY + 16, { align: 'right' });

    doc.text('CHANGE:', pageWidth - 35, finalY + 20);
    doc.text(`P${data.change.toFixed(2)}`, pageWidth - 5, finalY + 20, { align: 'right' });

    doc.line(5, finalY + 25, pageWidth - 5, finalY + 25);

    // Footer
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.text('Thank you for shopping!', centerX, finalY + 32, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.text('THIS SERVES AS YOUR OFFICIAL RECEIPT', centerX, finalY + 36, { align: 'center' });

    // Save/Download
    doc.save(`Receipt-${data.orderId}.pdf`);
};
