import { ApiProperty } from '@nestjs/swagger';

export class ScrapePeriodDto {
  @ApiProperty({ example: '2025-01-01' })
  period: Date;
}
