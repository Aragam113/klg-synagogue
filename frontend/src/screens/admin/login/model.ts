/** Вход по email и паролю. */
export interface LoginValues {
  email: string;
  password: string;
}

export const loginErrors = (v: LoginValues): Partial<Record<keyof LoginValues, string>> => {
  const out: Partial<Record<keyof LoginValues, string>> = {};
  if (!v.email.trim()) out.email = 'required';
  else if (!/^\S+@\S+\.\S+$/.test(v.email.trim())) out.email = 'email';
  if (!v.password) out.password = 'required';
  return out;
};
