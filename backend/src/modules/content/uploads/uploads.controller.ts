import {
  BadRequestException,
  CallHandler,
  Controller,
  ExecutionContext,
  NestInterceptor,
  PayloadTooLargeException,
  Inject,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { Observable, catchError, throwError } from 'rxjs';
import appConfig from '@config/app.config';
import { AdminOnly } from '@modules/admin';
import { ALLOWED_MIME, MAX_UPLOAD_BYTES, saveImageAsWebp } from './image';

/** multer отвечает 413 на превышение лимита — по контракту API это 400 с ключом поля. */
class TooLargeAs400 implements NestInterceptor {
  intercept(_ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      catchError((err: unknown) =>
        throwError(() =>
          err instanceof PayloadTooLargeException
            ? new BadRequestException({
                message: 'Файл больше 10 МБ',
                fields: { file: 'too_large' },
              })
            : err
        )
      )
    );
  }
}

@ApiTags('Admin: content')
@AdminOnly()
@Controller('admin/uploads')
export class UploadsController {
  constructor(
    @Inject(appConfig.KEY)
    private readonly conf: ConfigType<typeof appConfig>
  ) {}

  @Post()
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @UseInterceptors(
    TooLargeAs400,
    FileInterceptor('file', {
      limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 },
      fileFilter: (_req, file, cb) => {
        if (ALLOWED_MIME.includes(file.mimetype)) return cb(null, true);
        cb(
          new BadRequestException({
            message: 'Допустимы JPG, PNG, WebP',
            fields: { file: 'not_image' },
          }),
          false
        );
      },
    })
  )
  async upload(
    @UploadedFile() file?: Express.Multer.File
  ): Promise<{ url: string }> {
    if (!file) {
      throw new BadRequestException({
        message: 'Файл не передан',
        fields: { file: 'required' },
      });
    }
    return saveImageAsWebp(file.buffer, this.conf.uploadDir);
  }
}
