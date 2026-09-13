import { IsIn, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class SetDiscountDto {
  @IsIn(['PERCENTAGE', 'FIXED_AMOUNT']) readonly type!: 'PERCENTAGE' | 'FIXED_AMOUNT';
  @IsNumber() @Min(0) @Max(100000) readonly value!: number;
  @IsOptional() @IsString() readonly reason?: string;
}
