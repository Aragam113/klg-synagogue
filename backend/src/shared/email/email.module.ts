import { Module, Global } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { EmailService } from './email.service';
import { EmailProcessor } from './email.processor';
import { EmailTemplates } from './email.templates';

@Global()
@Module({
  imports: [
    BullModule.registerQueue({
      name: 'email',
    }),
  ],
  providers: [EmailService, EmailProcessor, EmailTemplates],
  exports: [EmailService],
})
export class EmailModule {}
