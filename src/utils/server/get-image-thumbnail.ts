import sharp from 'sharp';

/**
 * Compresses and resizes an image File down to a thumbnail.
 */
export async function getImageThumbnail(
  sourceFile: File,
  name: string,
  { targetHeight = 360, quality = 0.85 } = {},
): Promise<File> {
  try {
    // 1. Extract raw buffer array from the File object
    const arrayBuffer = await sourceFile.arrayBuffer();
    const inputBuffer = Buffer.from(arrayBuffer);

    // 2. Process image with sharp
    const outputBuffer = await sharp(inputBuffer)
      .resize({ height: targetHeight, withoutEnlargement: true })
      .jpeg({ quality: Math.round(quality * 100) }) 
      .toBuffer();

    // 3. Package output into a standard File instance
    return new File([outputBuffer], `${name}.jpg`, { type: 'image/jpeg' });
  } catch (error) {
    throw new Error(`Failed to generate image thumbnail: ${(error as Error).message}`);
  }
}
