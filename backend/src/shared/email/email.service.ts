import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

export interface SendEmailCodePayload {
  to: string;
  code: string;
  lang: string;
}

export interface SendPasswordResetCodePayload {
  to: string;
  code: string;
  lang: string;
}

@Injectable()
export class EmailService {
  constructor(
    @InjectQueue('email') private readonly emailQueue: Queue,
  ) {}

  async sendVerificationCode(payload: SendEmailCodePayload): Promise<void> {
    await this.emailQueue.add('verification-code', payload, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
    });
  }

  async sendPasswordResetCode(payload: SendPasswordResetCodePayload): Promise<void> {
    await this.emailQueue.add('password-reset-code', payload, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
    });
  }
}
