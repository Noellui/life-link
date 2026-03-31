export const addPdfFooter = (doc, reportName = 'Report') => {
    const pageCount = doc.internal.getNumberOfPages();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        
        // Top line for footer
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.5);
        doc.line(14, pageHeight - 20, pageWidth - 14, pageHeight - 20);

        // Styling for footer text
        doc.setFontSize(10);
        doc.setTextColor(150, 150, 150);
        
        const footerText = `LifeLink - ${reportName}`;
        const pageText = `Page ${i} of ${pageCount}`;
        const contactInfo = `Email: life.link20200@gmail.com | Phone: 9484468668`;

        // First Line: Title and Page numbers
        doc.text(footerText, 14, pageHeight - 14);
        doc.text(pageText, pageWidth - 14, pageHeight - 14, { align: 'right' });
        
        // Second Line: Center Contact info
        doc.setFontSize(9);
        doc.text(contactInfo, pageWidth / 2, pageHeight - 8, { align: 'center' });
    }
};
