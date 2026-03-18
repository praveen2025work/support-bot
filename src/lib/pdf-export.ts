'use client';

/**
 * PDF export utility for dashboards.
 * Uses html-to-image (supports modern CSS like oklch) + jsPDF for page assembly.
 */

export async function exportDashboardToPdf(
  element: HTMLElement,
  dashboardName: string
): Promise<void> {
  if (!element) {
    console.error('PDF export: element is null');
    return;
  }

  console.log('PDF export: starting capture of element', element.tagName);

  // Dynamic imports
  let toPng: typeof import('html-to-image').toPng;
  let jsPDFClass: typeof import('jspdf').jsPDF;

  try {
    const [htmlToImageModule, jsPDFModule] = await Promise.all([
      import('html-to-image'),
      import('jspdf'),
    ]);
    toPng = htmlToImageModule.toPng;
    jsPDFClass = jsPDFModule.jsPDF ?? jsPDFModule.default;
    console.log('PDF export: libraries loaded');
  } catch (err) {
    console.error('PDF export: failed to load libraries', err);
    alert('Failed to load PDF libraries. Please try again.');
    return;
  }

  // Prepare element for capture — temporarily linearize the grid and expand overflow
  const origStyles: { el: HTMLElement; props: Record<string, string> }[] = [];

  // Expand all overflow containers
  element.querySelectorAll<HTMLElement>('[class*="overflow-"]').forEach((el) => {
    origStyles.push({ el, props: { overflow: el.style.overflow, maxHeight: el.style.maxHeight } });
    el.style.overflow = 'visible';
    el.style.maxHeight = 'none';
  });

  // Linearize SimpleGrid items for capture
  const gridItems = element.querySelectorAll<HTMLElement>('.simple-grid-item');
  gridItems.forEach((el) => {
    origStyles.push({
      el,
      props: {
        width: el.style.width,
        height: el.style.height,
        minHeight: el.style.minHeight,
      },
    });
    el.style.width = '100%';
    el.style.height = 'auto';
    el.style.minHeight = '0';
  });

  // Linearize the grid container
  const gridContainer = element.querySelector<HTMLElement>('.simple-grid-layout, .layout');
  if (gridContainer) {
    origStyles.push({
      el: gridContainer,
      props: { display: gridContainer.style.display, height: gridContainer.style.height },
    });
    gridContainer.style.display = 'block';
    gridContainer.style.height = 'auto';
  }

  // Expand flex-1 containers
  element.querySelectorAll<HTMLElement>('.flex-1').forEach((el) => {
    origStyles.push({ el, props: { flex: el.style.flex, height: el.style.height } });
    el.style.flex = 'none';
    el.style.height = 'auto';
  });

  // Wait a tick for reflow
  await new Promise((r) => setTimeout(r, 150));

  let dataUrl: string;
  try {
    const captureWidth = element.scrollWidth;
    const captureHeight = element.scrollHeight;
    console.log('PDF export: capturing, element size:', captureWidth, 'x', captureHeight);

    dataUrl = await toPng(element, {
      width: captureWidth,
      height: captureHeight,
      pixelRatio: 2,
      backgroundColor: '#ffffff',
      style: {
        // Force light background on the captured element
        background: '#ffffff',
        color: '#000000',
      },
      filter: (node: HTMLElement) => {
        // Filter out hidden toolbar elements
        if (node.dataset?.printHide === 'true') return false;
        // Filter out drag/resize handles
        if (node.classList?.contains('resize-handle')) return false;
        return true;
      },
    });

    console.log('PDF export: capture successful, dataUrl length:', dataUrl.length);
  } catch (err) {
    console.error('PDF export: capture failed', err);
    // Restore styles before bailing
    restoreStyles(origStyles);
    alert('Failed to capture dashboard. Please try again.');
    return;
  }

  // Restore original styles
  restoreStyles(origStyles);

  if (!dataUrl || dataUrl.length < 100) {
    console.error('PDF export: captured image is empty');
    alert('Failed to capture dashboard content.');
    return;
  }

  try {
    // Create a temporary image to get dimensions
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Failed to load captured image'));
      img.src = dataUrl;
    });

    const imgWidth = img.naturalWidth;
    const imgHeight = img.naturalHeight;
    console.log('PDF export: image dimensions', imgWidth, 'x', imgHeight);

    // Landscape A4
    const pdf = new jsPDFClass({ orientation: 'landscape', unit: 'mm', format: 'a4' });
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

    // Use a canvas for slicing
    const srcCanvas = document.createElement('canvas');
    srcCanvas.width = imgWidth;
    srcCanvas.height = imgHeight;
    const srcCtx = srcCanvas.getContext('2d')!;
    srcCtx.drawImage(img, 0, 0);

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
      pageCanvas.height = Math.ceil(srcH);
      const ctx = pageCanvas.getContext('2d')!;
      ctx.drawImage(srcCanvas, 0, srcY, imgWidth, srcH, 0, 0, imgWidth, Math.ceil(srcH));

      const pageImgData = pageCanvas.toDataURL('image/png');
      pdf.addImage(pageImgData, 'PNG', margin, headerHeight + 2, contentWidth, drawH);

      yOffset += usableHeight;
      pageNum++;
    }

    const filename = `${dashboardName.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().slice(0, 10)}.pdf`;
    console.log('PDF export: saving as', filename, '- total pages:', pageNum - 1);
    pdf.save(filename);
    console.log('PDF export: download triggered');
  } catch (err) {
    console.error('PDF export: PDF generation failed', err);
    alert('Failed to generate PDF. Check console for details.');
  }
}

function restoreStyles(origStyles: { el: HTMLElement; props: Record<string, string> }[]) {
  origStyles.forEach(({ el, props }) => {
    Object.entries(props).forEach(([key, val]) => {
      (el.style as unknown as Record<string, string>)[key] = val;
    });
  });
}
