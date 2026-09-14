import * as pdfjsLib from 'pdfjs-dist';

// Set up PDF.js worker URL using CDN matching installed version to avoid bundler worker path issues
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || '4.10.38'}/pdf.worker.min.mjs`;

/**
 * Renders each page of a PDF File into a JPEG Data URL image object.
 * Each page is resized so its longest side is at most 1920px for high handwriting legibility.
 *
 * @param {File} pdfFile - PDF file selected by user
 * @returns {Promise<Array<{id: string, name: string, mimeType: string, data: string, isPdfPage: boolean, pageIndex: number}>>}
 */
export async function convertPdfFileToImages(pdfFile) {
  try {
    const arrayBuffer = await pdfFile.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdfDocument = await loadingTask.promise;
    const pageImages = [];

    const totalPages = pdfDocument.numPages;

    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      const page = await pdfDocument.getPage(pageNum);
      const unscaledViewport = page.getViewport({ scale: 1.0 });

      // Determine scale factor so longest side is at most 1920px (min scale 1.5 for text crispness)
      const maxDimension = Math.max(unscaledViewport.width, unscaledViewport.height);
      const scale = Math.max(1.5, Math.min(2.5, 1920 / maxDimension));

      const viewport = page.getViewport({ scale });

      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);

      // White background for transparent PDF elements
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, canvas.width, canvas.height);

      const renderContext = {
        canvasContext: context,
        viewport: viewport
      };

      await page.render(renderContext).promise;

      // Export as high quality JPEG Data URL
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);

      const baseName = pdfFile.name.replace(/\.pdf$/i, '');
      pageImages.push({
        id: `${Date.now()}-pdf-${pageNum}-${Math.random().toString(36).substring(2, 8)}`,
        name: `${baseName} (Page ${pageNum} of ${totalPages})`,
        mimeType: 'image/jpeg',
        data: dataUrl,
        isPdfPage: true,
        pageIndex: pageNum,
        totalPages: totalPages
      });
    }

    return pageImages;
  } catch (error) {
    console.error('Failed to convert PDF file to images on client:', error);
    throw new Error(`Could not read PDF "${pdfFile.name}". Please ensure it is a valid PDF document.`);
  }
}
