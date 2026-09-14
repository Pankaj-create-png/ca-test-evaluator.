import pdf2img from 'pdf-img-convert';

/**
 * Converts a PDF file (base64 string, data URI, or buffer) into an array of page images.
 * Each page is rendered as a PNG image formatted for Gemini API multimodal input.
 *
 * @param {string|Buffer|Object} pdfInput - PDF data (base64 or buffer or inline object)
 * @returns {Promise<Array<{data: string, mimeType: string, isPdfPage: boolean, pageIndex: number}>>}
 */
export async function convertPdfToImages(pdfInput) {
  try {
    let rawData = typeof pdfInput === 'string' ? pdfInput : (pdfInput.data || pdfInput.url || '');
    
    if (rawData.includes(';base64,')) {
      rawData = rawData.split(';base64,')[1];
    }
    rawData = rawData.replace(/\s/g, '');

    const pdfBuffer = Buffer.isBuffer(pdfInput)
      ? pdfInput
      : Buffer.from(rawData, 'base64');

    // Convert PDF buffer to high-resolution PNG base64 images (scale 2.0 for text clarity)
    const pageImageBase64Array = await pdf2img.convert(pdfBuffer, {
      scale: 2.0,
      base64_encoded: true
    });

    if (!Array.isArray(pageImageBase64Array) || pageImageBase64Array.length === 0) {
      throw new Error('No pages could be extracted from the uploaded PDF document.');
    }

    return pageImageBase64Array.map((b64, idx) => {
      const cleanB64 = typeof b64 === 'string' ? b64.replace(/\s/g, '') : Buffer.from(b64).toString('base64');
      return {
        data: cleanB64.startsWith('data:') ? cleanB64 : `data:image/png;base64,${cleanB64}`,
        mimeType: 'image/png',
        isPdfPage: true,
        pageIndex: idx + 1
      };
    });
  } catch (error) {
    console.error('PDF page conversion error:', error);
    throw new Error(`Failed to process uploaded PDF document: ${error.message}`);
  }
}

/**
 * Helper to process an array of uploaded files (images or PDFs).
 * If a PDF is encountered, it is converted into individual page images and flattened in sequence.
 *
 * @param {Array} fileList - List of uploaded files (image base64 or PDF base64)
 * @returns {Promise<Array>} Flattened list of page images
 */
export async function processAndFlattenPdfFiles(fileList = []) {
  if (!Array.isArray(fileList) || fileList.length === 0) {
    return [];
  }

  const flattenedImages = [];

  for (const item of fileList) {
    const rawStr = typeof item === 'string' ? item : (item.data || item.url || '');
    const mimeType = (typeof item === 'object' && item.mimeType) ? item.mimeType : '';
    
    const isPdf = mimeType.includes('pdf') || rawStr.includes('data:application/pdf') || rawStr.startsWith('JVBERi0'); // %PDF header in base64

    if (isPdf) {
      const convertedPages = await convertPdfToImages(item);
      flattenedImages.push(...convertedPages);
    } else {
      flattenedImages.push(item);
    }
  }

  return flattenedImages;
}
