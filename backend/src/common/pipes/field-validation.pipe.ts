import {
  ArgumentMetadata,
  BadRequestException,
  ValidationError,
  ValidationPipe,
} from '@nestjs/common';

export const VALIDATION_MESSAGE = 'Проверьте заполнение полей';

/** Машинный ключ ошибки по имени правила class-validator (фронт переводит ключи сам). */
const CONSTRAINT_KEYS: Record<string, string> = {
  isDefined: 'required',
  isNotEmpty: 'required',
  arrayNotEmpty: 'required',
  equals: 'required',
  isEmail: 'email',
  isPhoneNumber: 'phone',
  maxLength: 'too_long',
  arrayMaxSize: 'too_long',
  minLength: 'too_short',
  arrayMinSize: 'too_short',
  max: 'too_large',
  min: 'too_small',
  isPositive: 'too_small',
  isInt: 'integer',
  isNumber: 'number',
  isBoolean: 'boolean',
  isIn: 'invalid_choice',
  isEnum: 'invalid_choice',
  isDateString: 'date',
  isISO8601: 'date',
  isDate: 'date',
  matches: 'invalid_format',
  isUrl: 'url',
  isUUID: 'invalid_format',
  isUuid: 'invalid_format', // так правило зовёт class-validator
  isNumberString: 'number',
  whitelistValidation: 'unknown_field',
};
/** Сообщение-ключ, заданное в DTO: `@Validate(..., { message: 'date_too_soon' })`. */
const MACHINE_KEY = /^[a-z][a-z0-9_]*$/;

/**
 * Глобальная валидация тел: лишние поля запрещены, ответ 400
 * `{ message: 'Проверьте заполнение полей', fields: { 'title.ru': 'required', email: 'email' } }`.
 * На поле — один ключ: пусто → `required`, иначе ключ из DTO-сообщения или по правилу.
 */
export class FieldValidationPipe extends ValidationPipe {
  constructor() {
    super({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: (errors: ValidationError[]) =>
        new BadRequestException({
          message: VALIDATION_MESSAGE,
          error: 'Validation Error',
          fields: collectFieldErrors(errors),
        }),
    });
  }

  /**
   * `?lang=` фронт добавляет к каждому запросу (его читает `@Lang()`), поэтому query-DTO
   * его не объявляют: из объекта query он убирается до проверки лишних полей.
   */
  override transform(value: unknown, metadata: ArgumentMetadata) {
    if (
      metadata.type === 'query' &&
      metadata.data === undefined &&
      value &&
      typeof value === 'object' &&
      'lang' in value
    ) {
      const rest = { ...(value as Record<string, unknown>) };
      delete rest.lang;
      return super.transform(rest, metadata);
    }
    return super.transform(value, metadata);
  }
}

/** null/undefined доходят сюда только у обязательных полей; '' — если правило требует непустое. */
function isMissing(value: unknown, names: string[]): boolean {
  if (value === undefined || value === null) return true;
  return (
    typeof value === 'string' &&
    value.trim() === '' &&
    names.some((n) => CONSTRAINT_KEYS[n] === 'required')
  );
}

function errorKey(error: ValidationError): string {
  const constraints = error.constraints ?? {};
  const names = Object.keys(constraints);
  if (names.includes('whitelistValidation')) return 'unknown_field';
  if (isMissing(error.value, names)) return 'required';
  for (const name of names) {
    if (MACHINE_KEY.test(constraints[name])) return constraints[name];
  }
  for (const name of names) {
    if (CONSTRAINT_KEYS[name]) return CONSTRAINT_KEYS[name];
  }
  return 'invalid';
}

export function collectFieldErrors(
  errors: ValidationError[],
  prefix = ''
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const error of errors) {
    const path = prefix ? `${prefix}.${error.property}` : error.property;
    if (error.constraints && Object.keys(error.constraints).length) {
      result[path] = errorKey(error);
    }
    if (error.children?.length) {
      Object.assign(result, collectFieldErrors(error.children, path));
    }
  }
  return result;
}
