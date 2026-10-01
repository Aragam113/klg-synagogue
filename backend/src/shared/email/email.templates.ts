import { Injectable } from '@nestjs/common';

interface Translations {
  subject: string;
  title: string;
  message: string;
  codeLabel: string;
  footer: string;
}

@Injectable()
export class EmailTemplates {
  private readonly verificationCodeTranslations: Record<string, Translations> = {
    en: {
      subject: 'Your verification code - MyApp',
      title: 'Verification Code',
      message: 'Use the following code to verify your email address:',
      codeLabel: 'Your code:',
      footer: 'This code will expire in 10 minutes. If you did not request this code, please ignore this email.',
    },
    ru: {
      subject: 'Ваш код подтверждения - MyApp',
      title: 'Код подтверждения',
      message: 'Используйте следующий код для подтверждения вашего email:',
      codeLabel: 'Ваш код:',
      footer: 'Этот код действителен в течение 10 минут. Если вы не запрашивали этот код, проигнорируйте это письмо.',
    },
    es: {
      subject: 'Tu código de verificación - MyApp',
      title: 'Código de verificación',
      message: 'Usa el siguiente código para verificar tu correo electrónico:',
      codeLabel: 'Tu código:',
      footer: 'Este código expirará en 10 minutos. Si no solicitaste este código, ignora este correo.',
    },
  };

  private readonly passwordResetCodeTranslations: Record<string, Translations> = {
    en: {
      subject: 'Password reset code - MyApp',
      title: 'Password Reset',
      message: 'Use the following code to reset your password:',
      codeLabel: 'Your code:',
      footer: 'This code will expire in 10 minutes. If you did not request a password reset, please ignore this email.',
    },
    ru: {
      subject: 'Код для сброса пароля - MyApp',
      title: 'Сброс пароля',
      message: 'Используйте следующий код для сброса пароля:',
      codeLabel: 'Ваш код:',
      footer: 'Этот код действителен в течение 10 минут. Если вы не запрашивали сброс пароля, проигнорируйте это письмо.',
    },
    es: {
      subject: 'Código para restablecer contraseña - MyApp',
      title: 'Restablecer contraseña',
      message: 'Usa el siguiente código para restablecer tu contraseña:',
      codeLabel: 'Tu código:',
      footer: 'Este código expirará en 10 minutos. Si no solicitaste restablecer tu contraseña, ignora este correo.',
    },
  };

  getVerificationCodeSubject(lang: string): string {
    return this.verificationCodeTranslations[lang]?.subject
      || this.verificationCodeTranslations.en.subject;
  }

  getPasswordResetCodeSubject(lang: string): string {
    return this.passwordResetCodeTranslations[lang]?.subject
      || this.passwordResetCodeTranslations.en.subject;
  }

  getVerificationCodeTemplate(code: string, lang: string): string {
    const t = this.verificationCodeTranslations[lang] || this.verificationCodeTranslations.en;
    return this.buildTemplate(t, code);
  }

  getPasswordResetCodeTemplate(code: string, lang: string): string {
    const t = this.passwordResetCodeTranslations[lang] || this.passwordResetCodeTranslations.en;
    return this.buildTemplate(t, code);
  }

  private buildTemplate(t: Translations, value: string): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${t.title}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .container {
      background-color: #ffffff;
      border-radius: 12px;
      padding: 40px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    }
    .logo {
      text-align: center;
      margin-bottom: 30px;
    }
    .logo h1 {
      color: #4F46E5;
      font-size: 32px;
      margin: 0;
    }
    h2 {
      color: #333;
      font-size: 24px;
      margin-bottom: 20px;
      text-align: center;
    }
    p {
      color: #666;
      font-size: 16px;
      margin-bottom: 20px;
      text-align: center;
    }
    .code-container {
      background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%);
      border-radius: 8px;
      padding: 20px;
      text-align: center;
      margin: 30px 0;
    }
    .code-label {
      color: rgba(255, 255, 255, 0.9);
      font-size: 14px;
      margin-bottom: 10px;
    }
    .code {
      color: #ffffff;
      font-size: 36px;
      font-weight: bold;
      letter-spacing: 8px;
      font-family: 'Courier New', monospace;
    }
    .footer {
      color: #999;
      font-size: 12px;
      text-align: center;
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #eee;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">
      <h1>MyApp</h1>
    </div>

    <h2>${t.title}</h2>
    <p>${t.message}</p>

    <div class="code-container">
      <div class="code-label">${t.codeLabel}</div>
      <div class="code">${value}</div>
    </div>

    <div class="footer">
      ${t.footer}
    </div>
  </div>
</body>
</html>
    `.trim();
  }
}
