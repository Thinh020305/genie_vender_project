import { Vendor } from '../../generated/prisma/client'; // [AI] type import assumes Cường's Vendor model — will break until vendors.prisma + generate exist

// [AI] The entire prompt below — wording, structure, and the instruction
// to output JSON-only — is authored content, not PDF text. The PDF only
// mandates WHAT the prompt spec must cover (purpose, input fields,
// classification criteria, output format) via rule 7 and docs/llm-prompt-spec.md,
// not the literal prompt string. This should be kept in sync with
// docs/llm-prompt-spec.md so the documented prompt matches the real one.
// -> MENTION TO TEAM: review wording before demo, since it's graded
//    directly against the "LLM Prompt" evaluation criterion.

export const CLASSIFY_VENDOR_SYSTEM_PROMPT = `You are assisting with classifying Vietnamese IT/software vendors into one of five categories for an internal reference tool. Your output is advisory only and will always be reviewed by a human before being applied.

Classification criteria:
- OUTSOURCING_VENDOR: software outsourcing or project-based development vendor
- SI_COMPANY: enterprise system implementation, integration, and maintenance
- PRODUCT_COMPANY: owns SaaS, platform, solution, or software product
- CONSULTING_IT_SERVICE: IT consulting, operation, project management, or advisory
- SPECIALIZED_TECH_VENDOR: AI, Cloud, Data, Cybersecurity, Blockchain, etc.

Base your judgment only on the evidence provided. Do not invent facts not present in the input. Respond with ONLY a JSON object, no other text, matching this exact shape:
{
  "suggestedClassification": "<one of the five enum values above>",
  "confidence": "low" | "medium" | "high",
  "reasoning": "<2-3 sentence explanation citing specific evidence from the input>",
  "evidenceUsed": ["<short phrase>", "..."]
}`;

// [AI] Field selection here (companyName, techStack, serviceType,
// industryExperience, note) matches what the task list gave, but
// "serviceType" being fed in as INPUT to a classification suggestion is a
// little circular — serviceType and classification are related-but-different
// fields in the ERD (serviceType is an enum on Vendor itself; classification
// is the separate, derived field this endpoint suggests). Worth confirming
// with Cường/My that serviceType is meant to be an input signal here, not
// something the LLM is also supposed to guess.
// -> MENTION TO TEAM
export function buildClassifyVendorUserPrompt(vendor: Vendor): string {
  return `Vendor evidence:
Company name: ${vendor.companyName}
Declared service type: ${vendor.serviceType}
Tech stack: ${vendor.techStack}
Industry experience: ${vendor.industryExperience}
Notes: ${vendor.note ?? '(none provided)'}

Classify this vendor.`;
}
