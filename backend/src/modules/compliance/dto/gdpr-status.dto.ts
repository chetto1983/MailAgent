import { ApiProperty } from '@nestjs/swagger';

export class GdprCheckDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  label!: string;

  @ApiProperty({ enum: ['pass', 'warn', 'fail'] })
  status!: 'pass' | 'warn' | 'fail';

  @ApiProperty()
  details!: string;
}

export class DataSubjectRightDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  label!: string;

  @ApiProperty({ enum: ['available', 'manual', 'planned'] })
  status!: 'available' | 'manual' | 'planned';

  @ApiProperty()
  details!: string;
}

export class PendingActionDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  description!: string;

  @ApiProperty({ enum: ['low', 'medium', 'high'] })
  severity!: 'low' | 'medium' | 'high';

  @ApiProperty({ required: false })
  eta?: string;
}

export class GdprStatsDto {
  @ApiProperty()
  totalUsers!: number;

  @ApiProperty()
  softDeletedUsers!: number;

  @ApiProperty()
  auditLogEntries!: number;
}

export class GdprOfficerDto {
  @ApiProperty()
  name!: string;

  @ApiProperty()
  email!: string;
}

export class GdprStatusDto {
  @ApiProperty()
  compliant!: boolean;

  @ApiProperty({ enum: ['compliant', 'attention', 'non-compliant'] })
  status!: 'compliant' | 'attention' | 'non-compliant';

  @ApiProperty()
  lastAudit!: string;

  @ApiProperty()
  policyLastUpdated!: string;

  @ApiProperty({ type: GdprOfficerDto })
  dataProtectionOfficer!: GdprOfficerDto;

  @ApiProperty({ type: [GdprCheckDto] })
  checks!: GdprCheckDto[];

  @ApiProperty({ type: [DataSubjectRightDto] })
  dataSubjectRights!: DataSubjectRightDto[];

  @ApiProperty({ type: [PendingActionDto] })
  pendingActions!: PendingActionDto[];

  @ApiProperty({ type: GdprStatsDto })
  stats!: GdprStatsDto;
}
