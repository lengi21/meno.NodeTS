import { IsInt, IsString, Min } from 'class-validator';

export class AddItemDto {
  @IsString()
  readonly dishId!: string;

  @IsInt()
  @Min(1)
  readonly quantity!: number;
}
