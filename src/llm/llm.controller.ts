import { BadRequestException, Body, Controller, NotFoundException, Post, UseGuards } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role, VendorClassification } from '../generated/prisma/enums';
import { LlmService } from './llm.service';
import { ClassifyVendorDto } from './dto/classify-vendor.dto';
import { CLASSIFY_VENDOR_SYSTEM_PROMPT, buildClassifyVendorUserPrompt } from './prompts/classify-vendor.prompt';
import { ClassificationSuggestion } from './interfaces/classification-suggestion.interface';

@Controller('api/vendors')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LlmController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly llmService: LlmService,
  ) {}

  @Post('classify')
  // [AI] Guarded to ADMIN/DEVELOPER, REVIEWER excluded — inferred, not
  // stated for this specific route. Reasoning: the role table says
  // "DEVELOPER: register, update, search, classify, and summarize
  // vendors" (classify explicitly listed) and "REVIEWER: read-only access
  // to vendor data and classification RESULTS" (i.e. reading, not
  // triggering new LLM calls). This endpoint doesn't write to the DB, but
  // it does consume an external API per call, which reads more like an
  // action than a read.
  // -> MENTION TO TEAM — reasonable people could argue REVIEWER should be
  //    allowed to request a suggestion too, since it never touches the DB.
  @Roles(Role.ADMIN, Role.DEVELOPER)
  async classifyVendor(@Body() dto: ClassifyVendorDto): Promise<ClassificationSuggestion> {
    // [AI] this.prisma.vendor — same recurring blocker: no Vendor delegate
    // until vendors.prisma exists and prisma generate reruns.
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

    // [AI] Parsing + validating the model's JSON output against the real
    // enum is entirely my design — the PDF doesn't address what happens if
    // the model returns malformed JSON or an invalid enum value. Chose to
    // fail loudly (400) rather than silently coercing to some default
    // classification, since a silently-wrong guess is worse than an error
    // here.
    // -> MENTION TO TEAM
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

    // [AI] Rule 7 compliance line — this response is returned as-is and
    // NEVER written to vendor.classification or classification_histories
    // from this endpoint. Applying it requires a separate, explicit call
    // to PATCH /api/vendors/{id}/classification by a human. That
    // enforcement is structural (this controller has no write path at
    // all) rather than a flag/comment — worth confirming with the team
    // that this is understood as the actual mechanism satisfying rule 7,
    // not just documentation of intent.
    // -> MENTION TO TEAM
    return {
      ...parsed,
      disclaimer:
        'This is an AI-generated suggestion for reference only. It must be reviewed by a team member and confirmed via PATCH /api/vendors/{id}/classification before it takes effect.',
    };
  }
}
