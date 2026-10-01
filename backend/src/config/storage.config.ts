import { registerAs } from '@nestjs/config';

export default registerAs('storage', () => ({
  uploadDir: process.env.UPLOAD_DIR ?? './uploads',
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE ?? '5242880', 10),
}));
