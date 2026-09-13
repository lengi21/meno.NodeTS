import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class RestaurantSignInDto {
  @IsString()
  @IsNotEmpty()
  readonly email!: string;

  @IsString()
  @MinLength(1)
  readonly password!: string;

  @IsString()
  @MinLength(8)
  readonly deviceFingerprint!: string;

  @IsString()
  @IsNotEmpty()
  readonly deviceName!: string;
}
