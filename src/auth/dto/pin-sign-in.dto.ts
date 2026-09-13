import { IsString, Length } from 'class-validator';

export class PinSignInDto {
  @IsString()
  @Length(4, 4)
  readonly pin!: string;
}
