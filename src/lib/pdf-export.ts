'use client';

/**
 * PDF export utility for dashboards.
 * Uses html2canvas to screenshot the grid and jsPDF to assemble pages.
 */

export async function exportDashboardToPdf(
  element: HTMLElement,
  dashboardName: string
): Promise<void> {
  const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
    import('html2canvas'),
    import('jspdf'),
  ]);

  // Temporarily expand all cards to show full content for capture
  const origOverflows: { el: HTMLElement; val: string }[] = [];
  element.querySelectorAll<HTMLElement>('.overflow-hidden, .overflow-y-auto, .overflow-x-auto').forEach((el) => {
    origOverflows.push({ el, val: el.style.overflow });
    el.style.overflow = 'visible';
  });

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    logging: false,
    backgroundColor: '#ffffff',
    windowWidth: element.scrollWidth,
    windowHeight: element.scrollHeight,
  });

  // Restore original overflow
  origOverflows.forEach(({ el, val }) => { el.style.overflow = val; });

  const imgData = canvas.toDataURL('image/png');
  const imgWidth = canvas.width;
  const imgHeight = canvas.height;

  // Landscape A4
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  // Header
  const headerHeight = 14;
  const dateStr = new Date().toLocaleString();

  // Scale image to fit page width (minus margins)
  const margin = 10;
  const contentWidth = pageWidth - margin * 2;
  const scaledHeight = (imgHeight / imgWidth) * contentWidth;

  // Split into pages
  const usableHeight = pageHeight - headerHeight - margin * 2;
  let yOffset = 0;
  let pageNum = 1;

  while (yOffset < scaledHeight) {
    if (pageNum > 1) pdf.addPage();

    // Header on each page
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text(dashboardName, margin, margin + 6);
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.text(dateStr, pageWidth - margin, margin + 6, { align: 'right' });
    pdf.text(`Page ${pageNum}`, pageWidth / 2, margin + 6, { align: 'center' });
    pdf.setDrawColor(200);
    pdf.line(margin, headerHeight, pageWidth - margin, headerHeight);

    // Clip and draw portion of image for this page
    const srcY = (yOffset / scaledHeight) * imgHeight;
    const srcH = Math.min((usableHeight / scaledHeight) * imgHeight, imgHeight - srcY);
    const drawH = (srcH / imgHeight) * scaledHeight;

    // Create a sub-canvas for this page slice
    const pageCanvas = document.createElement('canvas');
    pageCanvas.width = imgWidth;
    pageCanvas.height = srcH;
    const ctx = pageCanvas.getContext('2d')!;
    ctx.drawImage(canvas, 0, srcY, imgWidth, srcH, 0, 0, imgWidth, srcH);

    const pageImgData = pageCanvas.toDataURL('image/png');
    pdf.addImage(pageImgData, 'PNG', margin, headerHeight + 2, contentWidth, drawH);

    yOffset += usableHeight;
    pageNum++;
  }

  pdf.save(`${dashboardName.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().slice(0, 10)}.pdf`);
}
