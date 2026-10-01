import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigType } from '@nestjs/config';
import appConfig from '@config/app.config';
import databaseConfig from '@config/database.config';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      useFactory: (
        db: ConfigType<typeof databaseConfig>,
        app: ConfigType<typeof appConfig>
      ) => ({
        type: 'postgres',
        host: db.host,
        port: db.port,
        username: db.username,
        password: db.password,
        database: db.database,
        entities: [__dirname + '/../../**/*.entity{.ts,.js}'],
        migrations: [__dirname + '/migrations/*{.ts,.js}'],
        synchronize: false,
        migrationsRun: true,
        logging: app.nodeEnv === 'development',
        extra: {
          max: 20,
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 2000,
        },
      }),
      inject: [databaseConfig.KEY, appConfig.KEY],
    }),
  ],
})
export class DatabaseModule {}
