import { Module, Global } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import Redis from 'ioredis';
import { RedisService } from './redis.service';
import redisConfig from '@config/redis.config';

export const REDIS_CLIENT = 'REDIS_CLIENT';

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      useFactory: (redis: ConfigType<typeof redisConfig>) => {
        return new Redis({
          host: redis.host,
          port: redis.port,
          password: redis.password,
          maxRetriesPerRequest: 3,
        });
      },
      inject: [redisConfig.KEY],
    },
    RedisService,
  ],
  exports: [REDIS_CLIENT, RedisService],
})
export class RedisModule {}
