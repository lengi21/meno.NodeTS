import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class SavePrinterDto {
  @IsString()
  readonly name!: string;

  @IsIn(['USB', 'BLUETOOTH', 'NETWORK'])
  readonly connection!: 'USB' | 'BLUETOOTH' | 'NETWORK';

  @IsOptional()
  @IsString()
  readonly address?: string;

  @IsOptional()
  @IsInt()
  @Min(58)
  @Max(80)
  readonly paperWidthMm?: number;
}
