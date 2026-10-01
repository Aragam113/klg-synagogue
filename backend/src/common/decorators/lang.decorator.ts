import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { DEFAULT_LANG, isLang, LangCode } from '../localization';

/** Язык ответа из `?lang=ru|en|he`; неизвестный или пустой — ru. */
export const Lang = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): LangCode => {
    const q = ctx.switchToHttp().getRequest<Request>().query.lang;
    return isLang(q) ? q : DEFAULT_LANG;
  }
);
