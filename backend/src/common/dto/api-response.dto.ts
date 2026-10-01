import { ApiProperty } from '@nestjs/swagger';

export class ApiResponse<T> {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'Operation completed successfully' })
  message: string;

  @ApiProperty()
  data: T;

  @ApiProperty({ example: null, nullable: true })
  error: string | null;

  constructor(partial: Partial<ApiResponse<T>>) {
    Object.assign(this, partial);
  }

  static success<T>(data: T, message = 'Success'): ApiResponse<T> {
    return new ApiResponse<T>({
      success: true,
      message,
      data,
      error: null,
    });
  }

  static error<T>(error: string, message = 'Error'): ApiResponse<T> {
    return new ApiResponse<T>({
      success: false,
      message,
      data: null as T,
      error,
    });
  }
}

export class PaginatedResponse<T> {
  @ApiProperty()
  items: T[];

  @ApiProperty({ example: 100 })
  total: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 20 })
  limit: number;

  @ApiProperty({ example: 5 })
  totalPages: number;

  @ApiProperty({ example: true })
  hasNext: boolean;

  @ApiProperty({ example: false })
  hasPrev: boolean;
}

export class CursorPaginatedResponse<T> {
  @ApiProperty()
  items: T[];

  @ApiProperty({ example: 'cursor_abc123', nullable: true })
  nextCursor: string | null;

  @ApiProperty({ example: true })
  hasMore: boolean;
}
