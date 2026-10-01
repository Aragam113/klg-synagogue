import { type FormEvent, type HTMLInputTypeAttribute, type ReactNode, useId, useRef } from 'react';

import { useLang } from '@/i18n/use-lang';

/** Hook: machine field-error key from the API (`required`, `email`, `date_closed`...) -> text in the current language (common:fieldErrors). */
export const useFieldErrorText = () => {
  const { t } = useLang();
  return (key?: string | null): string | undefined =>
    key ? t(`fieldErrors.${key}`, { defaultValue: key }) : undefined;
};

export interface FieldProps {
  label: ReactNode;
  value: string;
  onChangeText: (v: string) => void;
  /** Already localized text (use fieldErrorText(key) for API keys). */
  error?: string;
  hint?: ReactNode;
  name?: string;
  type?: HTMLInputTypeAttribute;
  multiline?: boolean;
  required?: boolean;
  placeholder?: string;
  autoComplete?: string;
  inputMode?: 'text' | 'email' | 'tel' | 'numeric' | 'decimal';
  min?: string;
  max?: string;
  disabled?: boolean;
}

export const Field = (p: FieldProps) => {
  const id = useId();
  const common = {
    id,
    name: p.name,
    value: p.value,
    required: p.required,
    placeholder: p.placeholder,
    disabled: p.disabled,
    className: 'field__input',
    'aria-invalid': p.error ? true : undefined,
    'aria-describedby': p.error ? `${id}-err` : undefined,
  };
  return (
    <div className={`field${p.error ? ' field--error' : ''}`}>
      <label className="field__label" htmlFor={id}>
        {p.label}
        {p.required ? <span className="field__req"> *</span> : null}
      </label>
      {p.multiline ? (
        <textarea {...common} rows={5} onChange={(e) => p.onChangeText(e.target.value)} />
      ) : (
        <input
          {...common}
          type={p.type ?? 'text'}
          autoComplete={p.autoComplete}
          inputMode={p.inputMode}
          min={p.min}
          max={p.max}
          onChange={(e) => p.onChangeText(e.target.value)}
        />
      )}
      {p.hint && !p.error ? <span className="field__hint">{p.hint}</span> : null}
      {p.error ? (
        <span className="field__error" id={`${id}-err`} role="alert">
          {p.error}
        </span>
      ) : null}
    </div>
  );
};

export interface SelectProps {
  label: ReactNode;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  error?: string;
  name?: string;
  required?: boolean;
  placeholder?: string;
}

export const Select = (p: SelectProps) => {
  const id = useId();
  return (
    <div className={`field${p.error ? ' field--error' : ''}`}>
      <label className="field__label" htmlFor={id}>
        {p.label}
        {p.required ? <span className="field__req"> *</span> : null}
      </label>
      <select
        id={id}
        name={p.name}
        className="field__input field__select"
        value={p.value}
        onChange={(e) => p.onChange(e.target.value)}
        aria-invalid={p.error ? true : undefined}
      >
        {p.placeholder !== undefined ? (
          <option value="" disabled>
            {p.placeholder}
          </option>
        ) : null}
        {p.options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {p.error ? (
        <span className="field__error" role="alert">
          {p.error}
        </span>
      ) : null}
    </div>
  );
};

export interface CheckboxProps {
  label: ReactNode;
  checked: boolean;
  onChange: (v: boolean) => void;
  error?: string;
  name?: string;
}

export const Checkbox = (p: CheckboxProps) => (
  <div className={`check-wrap${p.error ? ' field--error' : ''}`}>
    <label className="check">
      <input
        type="checkbox"
        name={p.name}
        checked={p.checked}
        onChange={(e) => p.onChange(e.target.checked)}
      />
      <span>{p.label}</span>
    </label>
    {p.error ? (
      <span className="field__error" role="alert">
        {p.error}
      </span>
    ) : null}
  </div>
);

export interface FormProps {
  /** Receives the honeypot value: send it to the API as-is (bots fill it, people never see it). */
  onSubmit: (honeypot: string) => void;
  children: ReactNode;
  /** Honeypot input name (default 'website'). */
  honeypotName?: string;
  busy?: boolean;
  className?: string;
}

/** <form noValidate> with a hidden honeypot input; prevents default submit. */
export const Form = ({
  onSubmit,
  children,
  honeypotName = 'website',
  busy,
  className = '',
}: FormProps) => {
  const hp = useRef<HTMLInputElement>(null);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!busy) onSubmit(hp.current?.value ?? '');
  };
  return (
    <form
      className={`form ${className}`}
      noValidate
      onSubmit={submit}
      aria-busy={busy || undefined}
    >
      <input
        ref={hp}
        className="hp"
        name={honeypotName}
        tabIndex={-1}
        autoComplete="off"
        aria-hidden
        defaultValue=""
      />
      {children}
    </form>
  );
};
