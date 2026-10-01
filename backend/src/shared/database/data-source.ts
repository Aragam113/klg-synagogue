import { DataSource, DataSourceOptions } from 'typeorm';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

const isCompiled = path.extname(__filename) === '.js';
const baseDir = isCompiled ? 'dist' : 'src';
const fileExt = isCompiled ? '.js' : '{.ts,.js}';

export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: process.env.DB_HOST ?? 'localhost',
  port: parseInt(process.env.DB_PORT ?? '5432', 10),
  username: process.env.DB_USERNAME ?? 'synagogue',
  password: process.env.DB_PASSWORD ?? '',
  database: process.env.DB_DATABASE ?? 'synagogue',
  entities: [`${baseDir}/**/*.entity${fileExt}`],
  migrations: [`${baseDir}/shared/database/migrations/*${fileExt}`],
  synchronize: false,
  logging: process.env.NODE_ENV === 'development',
};

const dataSource = new DataSource(dataSourceOptions);
export default dataSource;
