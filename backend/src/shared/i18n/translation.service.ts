import { Injectable } from '@nestjs/common';
import { I18nService, I18nContext } from 'nestjs-i18n';

@Injectable()
export class TranslationService {
  constructor(private readonly i18n: I18nService) {}

  async translate(
    key: string,
    args?: Record<string, unknown>,
    lang?: string,
  ): Promise<string> {
    const language = lang ?? I18nContext.current()?.lang ?? 'en';

    return await this.i18n.translate(key, { lang: language, args });
  }

  translateSync(
    key: string,
    args?: Record<string, unknown>,
    lang?: string,
  ): string {
    const language = lang ?? I18nContext.current()?.lang ?? 'en';

    return this.i18n.t(key, { lang: language, args });
  }

  async error(
    key: string,
    args?: Record<string, unknown>,
    lang?: string,
  ): Promise<string> {
    return this.translate(`errors.${key}`, args, lang);
  }

  async validation(
    key: string,
    args?: Record<string, unknown>,
    lang?: string,
  ): Promise<string> {
    return this.translate(`validation.${key}`, args, lang);
  }

  async push(
    key: string,
    args?: Record<string, unknown>,
    lang?: string,
  ): Promise<{ title: string; body: string }> {
    const language = lang ?? I18nContext.current()?.lang ?? 'en';

    const title = await this.translate(`push.${key}.title`, args, language);
    const body = await this.translate(`push.${key}.body`, args, language);

    return { title, body };
  }

  getCurrentLang(): string {
    return I18nContext.current()?.lang ?? 'en';
  }
}
