
import { Client } from '@replit/node-object-storage';
import crypto from 'crypto';
import sharp from 'sharp';

const storage = new Client();

/**
 * Generate a unique filename for an image
 */
const generateImageFilename = (originalName: string, type: string): string => {
  const hash = crypto.randomBytes(8).toString('hex');
  const ext = type.split('/')[1];
  return `${hash}.${ext}`;
};

/**
 * Process and optimize an image before storing
 */
const processImage = async (
  imageBuffer: Buffer,
  options: { width?: number; height?: number; quality?: number } = {}
): Promise<Buffer> => {
  const { width, height, quality = 80 } = options;
  
  return sharp(imageBuffer)
    .resize(width, height, {
      fit: 'inside',
      withoutEnlargement: true
    })
    .jpeg({ quality })
    .toBuffer();
};

/**
 * Upload an image to object storage
 */
export const uploadImage = async (
  imageData: string,
  folder: string,
  options: {
    width?: number;
    height?: number;
    quality?: number;
  } = {}
): Promise<string> => {
  // Remove the data URL prefix
  const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
  const imageBuffer = Buffer.from(base64Data, 'base64');
  
  // Process the image
  const processedImage = await processImage(imageBuffer, options);
  
  // Generate filename and full path
  const filename = generateImageFilename(
    'image',
    'image/jpeg'
  );
  const objectPath = `${folder}/${filename}`;
  
  // Upload to object storage
  await storage.put(objectPath, processedImage, {
    contentType: 'image/jpeg'
  });
  
  // Return the public URL
  const publicUrl = await storage.getPublicUrl(objectPath);
  return publicUrl;
};

/**
 * Delete an image from object storage
 */
export const deleteImage = async (url: string): Promise<void> => {
  try {
    const objectPath = new URL(url).pathname.slice(1);
    await storage.delete(objectPath);
  } catch (error) {
    console.error('Failed to delete image:', error);
  }
};
