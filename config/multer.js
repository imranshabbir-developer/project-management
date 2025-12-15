import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Base uploads directory
const baseUploadDir = path.join(__dirname, '../uploads');

// Create base uploads directory if it doesn't exist
if (!fs.existsSync(baseUploadDir)) {
  fs.mkdirSync(baseUploadDir, { recursive: true });
}

/**
 * Create multer instance with route-based folder structure
 * @param {string} routeName - The route name (e.g., 'onboarding', 'avatar', 'portfolio')
 * @param {object} options - Additional multer options
 * @returns {multer.Multer} Multer instance
 */
export const createMulterUpload = (routeName, options = {}) => {
  // Create route-specific directory
  const routeDir = path.join(baseUploadDir, routeName);
  if (!fs.existsSync(routeDir)) {
    fs.mkdirSync(routeDir, { recursive: true });
  }

  // Storage configuration
  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, routeDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const ext = path.extname(file.originalname);
      const name = path.basename(file.originalname, ext);
      // Sanitize filename
      const sanitizedName = name.replace(/[^a-zA-Z0-9]/g, '_');
      cb(null, `${sanitizedName}-${uniqueSuffix}${ext}`);
    }
  });

  // File filter
  const fileFilter = (req, file, cb) => {
    // Allow images only by default
    const allowedMimes = options.allowedMimes || ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Only ${allowedMimes.join(', ')} files are allowed!`), false);
    }
  };

  // Multer configuration
  return multer({
    storage: storage,
    limits: {
      fileSize: options.maxFileSize || parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024, // 5MB default
    },
    fileFilter: fileFilter
  });
};

// Default export for backward compatibility
const defaultUpload = createMulterUpload('general');
export default defaultUpload;

// Helper function to get file URL
export const getFileUrl = (routeName, filename) => {
  return `/uploads/${routeName}/${filename}`;
};

// Helper function to get file path
export const getFilePath = (routeName, filename) => {
  return path.join(baseUploadDir, routeName, filename);
};
