import { ApiProperty } from '@nestjs/swagger';

export class TwiterLoginDto {
  @ApiProperty({ example: 'username', description: 'Twitter username' })
  username: string;

  @ApiProperty({ example: 'password', description: 'Twitter password' })
  password: string;
}
