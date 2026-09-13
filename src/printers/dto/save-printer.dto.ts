import { IsArray, IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { PrintJobType } from '@prisma/client';

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

  @IsOptional()
  @IsArray()
  @IsIn(Object.values(PrintJobType), { each: true })
  readonly routes?: PrintJobType[];
}
