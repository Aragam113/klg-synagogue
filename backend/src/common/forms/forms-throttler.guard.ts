import { ExecutionContext, Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

export const FORMS_THROTTLER = 'forms';
export const TOO_MANY_REQUESTS =
  'Слишком много отправок. Попробуйте через минуту';

/** Лимит считается на IP сразу по всем публичным формам, а не по каждому маршруту отдельно. */
@Injectable()
export class FormsThrottlerGuard extends ThrottlerGuard {
  protected generateKey(
    _context: ExecutionContext,
    tracker: string,
    name: string
  ): string {
    return `${name}:${tracker}`;
  }

  protected async getErrorMessage(): Promise<string> {
    return TOO_MANY_REQUESTS;
  }
}
