import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { LabelsService } from '../services/labels.service';
import {
  AddEmailsToLabelDto,
  CreateLabelDto,
  ReorderLabelsDto,
  UpdateLabelDto,
} from '../dto/labels.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { FeatureFlag } from '../../../common/decorators/feature-flag.decorator';
import { FeatureFlagGuard } from '../../../common/guards/feature-flag.guard';
import { AuthenticatedRequest } from '../../../common/types/request.types';

@Controller('labels')
@UseGuards(JwtAuthGuard, FeatureFlagGuard)
@FeatureFlag('userLabels')
export class LabelsController {
  constructor(private readonly labelsService: LabelsService) {}

  @Get()
  async listLabels(@Req() req: AuthenticatedRequest) {
    const labels = await this.labelsService.findAllByTenant(req.user.tenantId);
    return { labels };
  }

  @Get(':id')
  async getLabel(@Req() req: AuthenticatedRequest, @Param('id') labelId: string) {
    const label = await this.labelsService.findOne(req.user.tenantId, labelId);
    return { label };
  }

  @Post()
  async createLabel(@Req() req: AuthenticatedRequest, @Body() dto: CreateLabelDto) {
    const label = await this.labelsService.create(req.user.tenantId, dto);
    return { label };
  }

  @Put(':id')
  async updateLabel(
    @Req() req: AuthenticatedRequest,
    @Param('id') labelId: string,
    @Body() dto: UpdateLabelDto,
  ) {
    const label = await this.labelsService.update(req.user.tenantId, labelId, dto);
    return { label };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteLabel(@Req() req: AuthenticatedRequest, @Param('id') labelId: string) {
    await this.labelsService.delete(req.user.tenantId, labelId);
  }

  @Post(':id/emails')
  async addEmails(
    @Req() req: AuthenticatedRequest,
    @Param('id') labelId: string,
    @Body() dto: AddEmailsToLabelDto,
  ) {
    const result = await this.labelsService.addEmailsToLabel(req.user.tenantId, labelId, dto);
    return result;
  }

  @Delete(':id/emails/:emailId')
  async removeEmail(
    @Req() req: AuthenticatedRequest,
    @Param('id') labelId: string,
    @Param('emailId') emailId: string,
  ) {
    const email = await this.labelsService.removeEmailFromLabel(req.user.tenantId, labelId, emailId);
    return { email };
  }

  @Get(':id/emails')
  async getEmails(@Req() req: AuthenticatedRequest, @Param('id') labelId: string) {
    const emails = await this.labelsService.getEmailsForLabel(req.user.tenantId, labelId);
    return { emails };
  }

  @Post('reorder')
  @HttpCode(HttpStatus.NO_CONTENT)
  async reorder(
    @Req() req: AuthenticatedRequest,
    @Body() dto: ReorderLabelsDto,
  ) {
    await this.labelsService.reorder(req.user.tenantId, dto);
  }
}
