import { Process, Processor } from '@nestjs/bull';
import { Inject, Logger } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { Job } from 'bull';
import * as nodemailer from 'nodemailer';
import { SendEmailCodePayload, SendPasswordResetCodePayload } from './email.service';
import { EmailTemplates } from './email.templates';
import emailConfig from '@config/email.config';

@Processor('email')
export class EmailProcessor {
  private readonly logger = new Logger(EmailProcessor.name);
  private transporter: nodemailer.Transporter;

  constructor(
    @Inject(emailConfig.KEY)
    private readonly emailConf: ConfigType<typeof emailConfig>,
    private readonly emailTemplates: EmailTemplates,
  ) {
    this.initializeTransporter();
  }

  private initializeTransporter(): void {
    const { host, port, user, password } = this.emailConf;

    const config: nodemailer.TransportOptions = {
      host,
      port,
      secure: port === 465,
    } as nodemailer.TransportOptions;

    if (user && password) {
      (config as any).auth = { user, pass: password };
    }

    this.transporter = nodemailer.createTransport(config);

    this.logger.log(`Email transporter initialized: ${host}:${port}`);
  }

  @Process('verification-code')
  async handleVerificationCode(job: Job<SendEmailCodePayload>): Promise<void> {
    const { to, code, lang } = job.data;

    this.logger.log(`Processing verification code email to ${to}`);

    const html = this.emailTemplates.getVerificationCodeTemplate(code, lang);
    const subject = this.emailTemplates.getVerificationCodeSubject(lang);

    await this.sendEmail(to, subject, html);

    this.logger.log(`Verification code email sent to ${to}`);
  }

  @Process('password-reset-code')
  async handlePasswordResetCode(job: Job<SendPasswordResetCodePayload>): Promise<void> {
    const { to, code, lang } = job.data;

    this.logger.log(`Processing password reset code email to ${to}`);

    const html = this.emailTemplates.getPasswordResetCodeTemplate(code, lang);
    const subject = this.emailTemplates.getPasswordResetCodeSubject(lang);

    await this.sendEmail(to, subject, html);

    this.logger.log(`Password reset code email sent to ${to}`);
  }

  private async sendEmail(to: string, subject: string, html: string): Promise<void> {
    try {
      const info = await this.transporter.sendMail({
        from: this.emailConf.from,
        to,
        subject,
        html,
      });

      this.logger.log(`Email sent: ${info.messageId}`);
    } catch (error) {
      this.logger.error(`Failed to send email to ${to}:`, error);
      throw error;
    }
  }
}
