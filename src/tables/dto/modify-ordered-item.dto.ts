import { IsInt, Min } from 'class-validator';

export class ModifyOrderedItemDto {
  @IsInt()
  @Min(0)
  readonly quantity!: number;
}
