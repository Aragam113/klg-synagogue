import { FindOptionsWhere, DeepPartial, FindManyOptions } from 'typeorm';

export interface IBaseRepository<T> {
  findById(id: number): Promise<T | null>;
  findOne(where: FindOptionsWhere<T>): Promise<T | null>;
  findAll(options?: FindManyOptions<T>): Promise<T[]>;
  create(data: DeepPartial<T>): T;
  save(entity: T): Promise<T>;
  update(id: number, data: DeepPartial<T>): Promise<void>;
  delete(id: number): Promise<void>;
  softDelete(id: number): Promise<void>;
  exists(where: FindOptionsWhere<T>): Promise<boolean>;
}
