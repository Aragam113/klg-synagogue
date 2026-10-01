import { Module, Global } from '@nestjs/common';
import {
  I18nModule,
  AcceptLanguageResolver,
  HeaderResolver,
} from 'nestjs-i18n';
import * as path from 'path';
import { TranslationService } from './translation.service';

@Global()
@Module({
  imports: [
    I18nModule.forRoot({
      fallbackLanguage: 'en',
      loaderOptions: {
        path: path.resolve(process.cwd(), 'src/i18n'),
        watch: process.env.NODE_ENV === 'development',
      },
      resolvers: [AcceptLanguageResolver, new HeaderResolver(['x-lang'])],
    }),
  ],
  providers: [TranslationService],
  exports: [TranslationService],
})
export class I18nConfigModule {}
