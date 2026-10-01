import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ConfigType } from '@nestjs/config';
import redisConfig from '@config/redis.config';

@Module({
  imports: [
    BullModule.forRootAsync({
      useFactory: (redis: ConfigType<typeof redisConfig>) => ({
        redis: {
          host: redis.host,
          port: redis.port,
          password: redis.password,
        },
        defaultJobOptions: {
          removeOnComplete: true,
          removeOnFail: false,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 1000,
          },
        },
      }),
      inject: [redisConfig.KEY],
    }),
  ],
  exports: [BullModule],
})
export class QueueModule {}
