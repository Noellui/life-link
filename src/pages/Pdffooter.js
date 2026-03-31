/**
 * addPdfFooter — draws the LifeLink admin footer on every page of a jsPDF doc.
 *
 * Call this ONCE after all autoTable / content calls, just before doc.save().
 *
 * @param {import('jspdf').jsPDF} doc
 * @param {string} reportTitle  e.g. "Financial & Revenue Report"
 */
export function addPdfFooter(doc, reportTitle = 'Admin Report') {
    const pageCount = doc.getNumberOfPages();
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();

    const now = new Date();

    const dateStr = now.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    }); // "31 Mar 2026"

    const timeStr = now.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        timeZone: 'Asia/Kolkata',
    }) + ' IST'; // "10:45 AM IST"

    const year = now.getFullYear();

    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);

        const footerY = pageH - 18; // baseline for footer content
        const cardTop = footerY - 10;
        const cardH = 16;
        const padX = 14;

        // ── Background card ──────────────────────────────────────────────────────
        doc.setFillColor(31, 41, 55);          // #1F2937 dark
        doc.roundedRect(padX, cardTop, pageW - padX * 2, cardH, 2, 2, 'F');

        // ── Red left accent bar ──────────────────────────────────────────────────
        doc.setFillColor(220, 38, 38);         // #DC2626
        doc.rect(padX, cardTop, 3, cardH, 'F');

        // ── "LifeLink Admin Portal · <reportTitle>" ──────────────────────────────
        doc.setFontSize(7.5);
        doc.setTextColor(249, 250, 251);       // #F9FAFB almost white
        doc.setFont(undefined, 'bold');
        doc.text('LifeLink Admin Portal', padX + 7, footerY - 3);

        // measure the bold part so we can place the separator + title right after
        const portalWidth = doc.getTextWidth('LifeLink Admin Portal');

        doc.setTextColor(107, 114, 128);       // #6B7280 separator dot
        doc.setFont(undefined, 'normal');
        doc.text('\u00B7', padX + 7 + portalWidth + 1.5, footerY - 3);

        const dotWidth = doc.getTextWidth('\u00B7');

        doc.setTextColor(209, 213, 219);       // #D1D5DB report title
        doc.text(reportTitle, padX + 7 + portalWidth + dotWidth + 3, footerY - 3);

        // ── Copyright / contact line ─────────────────────────────────────────────
        doc.setFontSize(6);
        doc.setTextColor(156, 163, 175);       // #9CA3AF
        doc.text(
            `\u00A9 ${year} LifeLink Project \u00B7 Developed by BCA Students \u00B7 support@lifelink-project.org \u00B7 +91 94844 68668`,
            padX + 7,
            footerY + 2.5,
        );

        // ── Date + time (right-aligned) ──────────────────────────────────────────
        const rightX = pageW - padX - 6;

        doc.setFontSize(7.5);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(249, 250, 251);
        doc.text(dateStr, rightX, footerY - 3, { align: 'right' });

        doc.setFontSize(6);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(156, 163, 175);
        doc.text(timeStr, rightX, footerY + 2.5, { align: 'right' });
    }
}