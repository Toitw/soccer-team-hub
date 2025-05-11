
import { apiRequest } from './queryClient';

/**
 * Maximum file size in bytes (5MB)
 */
export const MAX_FILE_SIZE = 5 * 1024 * 1024;

/**
 * Allowed image MIME types
 */
export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp'
];

/**
 * Convert a File to base64 string
 */
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

/**
 * Validate image file
 */
export const validateImageFile = (file: File): string | null => {
  if (file.size > MAX_FILE_SIZE) {
    return 'File size must be less than 5MB';
  }
  
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return 'File must be a valid image (JPEG, PNG, GIF, or WebP)';
  }
  
  return null;
};

/**
 * Upload an image for a team
 */
export const uploadTeamImage = async (teamId: number, imageFile: File, type: 'logo' | 'banner' = 'logo') => {
  const error = validateImageFile(imageFile);
  if (error) {
    throw new Error(error);
  }

  const base64 = await fileToBase64(imageFile);
  return apiRequest(`/api/teams/${teamId}/${type}`, {
    method: 'POST',
    data: { imageData: base64 }
  });
};

/**
 * Upload a user profile picture
 */
export const uploadProfilePicture = async (userId: number, imageFile: File) => {
  const error = validateImageFile(imageFile);
  if (error) {
    throw new Error(error);
  }

  const base64 = await fileToBase64(imageFile);
  return apiRequest(`/api/users/${userId}/profile-picture`, {
    method: 'POST',
    data: { imageData: base64 }
  });
};
