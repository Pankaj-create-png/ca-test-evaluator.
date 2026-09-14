import imageCompression from 'browser-image-compression';

/**
 * Compresses and resizes an uploaded image file on the frontend before upload.
 * - Caps longest dimension at 1920px
 * - Target file size under 500KB-1MB (maxSizeMB: 0.8)
 * - Preserves handwriting legibility for CA exam evaluation
 *
 * @param {File} file - Original image file from input/camera/gallery
 * @returns {Promise<File>} Compressed Image File
 */
export async function compressImageFile(file) {
  // Skip compression if not an image (e.g. PDF handled separately)
  if (!file.type.startsWith('image/')) {
    return file;
  }

  const options = {
    maxSizeMB: 0.8,
    maxWidthOrHeight: 1920,
    useWebWorker: true,
    fileType: 'image/jpeg',
    initialQuality: 0.85
  };

  try {
    const compressedBlob = await imageCompression(file, options);
    // Maintain original filename
    const compressedFile = new File([compressedBlob], file.name, {
      type: 'image/jpeg',
      lastModified: Date.now()
    });
    return compressedFile;
  } catch (error) {
    console.warn('Image compression fallback to original file:', error);
    return file;
  }
}

/**
 * Converts a File object (compressed or original) to base64 Data URL string.
 *
 * @param {File} file
 * @returns {Promise<string>} Data URL base64 string
 */
export function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}
