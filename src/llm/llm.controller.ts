// src/llm/llm.controller.ts
import { BadRequestException, Body, Controller, NotFoundException, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role, VendorClassification } from '../generated/prisma/enums';
import { LlmService } from './llm.service';
import { ClassifyVendorDto } from './dto/classify-vendor.dto';
import { CLASSIFY_VENDOR_SYSTEM_PROMPT, buildClassifyVendorUserPrompt } from './prompts/classify-vendor.prompt';
import { ClassificationSuggestion } from './interfaces/classification-suggestion.interface';

@ApiTags('vendors')
@ApiBearerAuth()
@Controller('api/vendors')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LlmController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly llmService: LlmService,
  ) {}

  @Post('classify')
  @Roles(Role.ADMIN, Role.DEVELOPER)
  @ApiOperation({
    summary: 'Get an LLM-generated classification suggestion for a vendor',
    description:
      'Reference only — see docs/llm-prompt-spec.md. Does not write to the database; apply via PATCH /api/vendors/{id}/classification.',
  })
  @ApiResponse({ status: 200, type: ClassificationSuggestion })
  @ApiResponse({ status: 400, description: 'LLM returned invalid JSON or an unrecognized classification value' })
  @ApiResponse({ status: 404, description: 'Vendor not found' })
  @ApiResponse({ status: 500, description: 'Upstream LLM call failed' })
  async classifyVendor(@Body() dto: ClassifyVendorDto): Promise<ClassificationSuggestion> {
    const vendor = await this.prisma.vendor.findUnique({
      where: { id: dto.vendorId },
    });

    if (!vendor) {
      throw new NotFoundException(`Vendor ${dto.vendorId} not found`);
    }

    const userPrompt = buildClassifyVendorUserPrompt(vendor);
    const rawResponse = await this.llmService.generateCompletion(
      CLASSIFY_VENDOR_SYSTEM_PROMPT,
      userPrompt,
    );

    let parsed: ClassificationSuggestion;
    try {
      parsed = JSON.parse(rawResponse);
    } catch {
      throw new BadRequestException('LLM did not return valid JSON');
    }

    if (!Object.values(VendorClassification).includes(parsed.suggestedClassification)) {
      throw new BadRequestException(
        `LLM returned an invalid classification: ${parsed.suggestedClassification}`,
      );
    }

    return {
      ...parsed,
      disclaimer:
        'This is an AI-generated suggestion for reference only. It must be reviewed by a team member and confirmed via PATCH /api/vendors/{id}/classification before it takes effect.',
    };
  }
}
