import { Injectable, BadRequestException, Inject } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import * as path from 'path';
import * as fs from 'fs';
import { I18nService } from 'nestjs-i18n';
import appConfig from '@config/app.config';

export interface UploadedFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  buffer: Buffer;
  size: number;
}

export interface FileUploadResult {
  url: string;
  filename: string;
}

@Injectable()
export class FileStorageService {
  private readonly uploadDir: string;
  private readonly baseUrl: string;
  private readonly maxFileSize = 5 * 1024 * 1024; // 5MB
  private readonly allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];

  constructor(
    @Inject(appConfig.KEY)
    private readonly appConf: ConfigType<typeof appConfig>,
    private readonly i18n: I18nService,
  ) {
    this.uploadDir = this.appConf.uploadDir;
    this.baseUrl = this.appConf.baseUrl;

    this.ensureDirectoryExists(path.join(this.uploadDir, 'uploads'));
  }

  private ensureDirectoryExists(dir: string): void {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  async uploadFile(
    file: UploadedFile,
    subDir: string,
    prefix: string,
    lang: string,
  ): Promise<FileUploadResult> {
    this.validateFile(file, lang);

    this.ensureDirectoryExists(path.join(this.uploadDir, subDir));

    const ext = path.extname(file.originalname) || '.jpg';
    const filename = `${prefix}_${Date.now()}${ext}`;
    const relativePath = path.join(subDir, filename);
    const absolutePath = path.join(this.uploadDir, relativePath);

    fs.writeFileSync(absolutePath, file.buffer);

    const url = `${this.baseUrl}/uploads/${relativePath.replace(/\\/g, '/')}`;

    return { url, filename };
  }

  async deleteFile(fileUrl: string): Promise<void> {
    if (!fileUrl) return;

    try {
      const urlPath = new URL(fileUrl).pathname;
      const relativePath = urlPath.replace('/uploads/', '');
      const absolutePath = path.join(this.uploadDir, relativePath);

      if (fs.existsSync(absolutePath)) {
        fs.unlinkSync(absolutePath);
      }
    } catch {
      // Ignore errors when deleting
    }
  }

  private validateFile(file: UploadedFile, lang: string): void {
    if (!file || !file.buffer) {
      throw new BadRequestException(
        this.i18n.t('errors.file.required', { lang }),
      );
    }

    if (file.size > this.maxFileSize) {
      throw new BadRequestException(
        this.i18n.t('errors.file.tooLarge', { lang }),
      );
    }

    if (!this.allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        this.i18n.t('errors.file.invalidFormat', { lang }),
      );
    }
  }
}
