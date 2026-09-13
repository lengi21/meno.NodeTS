import { LanguageCode, PaymentMethod } from '@prisma/client';
import { IsBoolean, IsEnum, IsNumber, IsOptional, IsString, Min, ValidateIf } from 'class-validator';

export class CloseChequeDto {
  @IsEnum(PaymentMethod)
  readonly method!: PaymentMethod;

  @IsOptional()
  @IsNumber()
  @Min(0)
  readonly receivedAmount?: number;

  @ValidateIf((value: CloseChequeDto) => value.method === PaymentMethod.CARD || value.method === PaymentMethod.TRANSFER)
  @IsString()
  readonly bankName?: string;

  @ValidateIf((value: CloseChequeDto) => value.method === PaymentMethod.TRANSFER)
  @IsString()
  readonly iban?: string;

  @IsBoolean()
  readonly printReceipt!: boolean;

  @IsEnum(LanguageCode)
  readonly receiptLanguage!: LanguageCode;
}
