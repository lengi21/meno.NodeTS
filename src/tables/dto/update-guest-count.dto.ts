import { IsInt, Max, Min } from 'class-validator';

export class UpdateGuestCountDto {
  @IsInt()
  @Min(1)
  @Max(99)
  readonly guestCount!: number;
}
