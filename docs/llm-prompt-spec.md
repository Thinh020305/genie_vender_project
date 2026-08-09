# LLM Prompt Specification — Vendor Auto-Classification

> Owner: Sơn. Covers `POST /api/vendors/classify`. Written to satisfy
> business rule 7 ("Prompt must include purpose, input fields,
> classification criteria, and output format") and the graded
> "LLM Prompt" evaluation criterion.
>
> Sections marked **[AI note]** below flag content invented to make the
> endpoint work, not text pulled from `genie_topic.pdf`. Review these with
> the team before the demo — they're kept in so nothing is presented as
> spec-mandated when it isn't.

---

## 1. Purpose

This endpoint gives a human reviewer a starting-point suggestion for which
of the five standard categories a vendor belongs in, based on evidence
already stored on the vendor record. It exists to speed up manual
classification, not to replace it — every suggestion returned by this
endpoint is advisory only (rule 7) and has no effect on the database until
a human applies it via `PATCH /api/vendors/{id}/classification`.

## 2. Context

Korean companies evaluating Vietnamese IT/software vendors work from
scattered, inconsistent source material (company sites, directories,
LinkedIn, articles). Classifying a vendor into one of five categories
requires reading and weighing that evidence — this endpoint automates the
first pass so a human reviewer starts from a reasoned suggestion instead of
a blank page.

> **[AI note]:** this "why" framing is derived from the PDF's Background
> section, not copied from it. Worth a quick read-through before it goes
> in front of the graduation panel.

## 3. Endpoint

| | |
|---|---|
| Method / Path | `POST /api/vendors/classify` |
| Auth | JWT required |
| Roles | `ADMIN`, `DEVELOPER` (REVIEWER excluded) |
| Request body | `{ "vendorId": "<uuid>" }` |
| Side effects | **None.** No DB write occurs from this endpoint. |

> **[AI note]:** role restriction is inferred from the role-description
> text in the PDF, not stated for this specific route — see the flag list
> from the LLM module writeup. Confirm with the team before relying on it.

## 4. Input Fields

The prompt is built server-side from five fields on the looked-up vendor
record:

| Field | Source | Notes |
|---|---|---|
| `companyName` | `Vendor.companyName` | |
| `serviceType` | `Vendor.serviceType` | Declared enum value, fed in as a signal — see caveat below |
| `techStack` | `Vendor.techStack` | |
| `industryExperience` | `Vendor.industryExperience` | |
| `note` | `Vendor.note` | Falls back to `"(none provided)"` if null |

> **[AI note]:** this is a subset of the PDF's full "Minimum Vendor Data
> Fields" list (which also includes `vendorCode`, `website`, `location`,
> `languageCapability`, `companySize`, `sourceUrl`). Excluding those five
> was a judgment call — they read as less relevant to *category*
> classification specifically — but it's a real scope decision, not spec
> text. Worth confirming with Cường/My whether `location` or `companySize`
> should factor in.
>
> **[AI note]:** feeding `serviceType` in as input to a suggestion *about*
> classification is slightly circular, since the two are related-but-
> distinct fields in the ERD. Flagged in the LLM module review — still
> unresolved as of this doc.

## 5. Classification Criteria

The five standard categories, as defined in `genie_topic.pdf`:

| Category | Definition |
|---|---|
| `OUTSOURCING_VENDOR` | Software outsourcing or project-based development vendor |
| `SI_COMPANY` | Enterprise system implementation, integration, and maintenance |
| `PRODUCT_COMPANY` | Owns a SaaS, platform, solution, or software product |
| `CONSULTING_IT_SERVICE` | IT consulting, operation, project management, or advisory |
| `SPECIALIZED_TECH_VENDOR` | AI, Cloud, Data, Cybersecurity, Blockchain, etc. |

These are copied verbatim from the spec and match `VendorClassification` in
`prisma/schema/enums.prisma` — no drift between the two.

## 6. Prompt Template

**System prompt** (from `src/llm/prompts/classify-vendor.prompt.ts`,
`CLASSIFY_VENDOR_SYSTEM_PROMPT`):

You are assisting with classifying Vietnamese IT/software vendors into one of five categories for an internal reference tool. Your output is advisory only and will always be reviewed by a human before being applied.

Classification criteria:

OUTSOURCING_VENDOR: software outsourcing or project-based development vendor
SI_COMPANY: enterprise system implementation, integration, and maintenance
PRODUCT_COMPANY: owns SaaS, platform, solution, or software product
CONSULTING_IT_SERVICE: IT consulting, operation, project management, or advisory
SPECIALIZED_TECH_VENDOR: AI, Cloud, Data, Cybersecurity, Blockchain, etc.

Base your judgment only on the evidence provided. Do not invent facts not present in the input. Respond with ONLY a JSON object, no other text, matching this exact shape:
{
"suggestedClassification": "<one of the five enum values above>",
"confidence": "low" | "medium" | "high",
"reasoning": "<2-3 sentence explanation citing specific evidence from the input>",
"evidenceUsed": ["<short phrase>", "..."]
}


**User prompt template** (`buildClassifyVendorUserPrompt`):

Vendor evidence:
Company name: {companyName}
Declared service type: {serviceType}
Tech stack: {techStack}
Industry experience: {industryExperience}
Notes: {note or "(none provided)"}

Classify this vendor.


> **[AI note]:** this exact wording, structure, and the JSON-only
> instruction are authored, not spec text. The PDF only mandates *what*
> must be covered (rule 7), never the literal prompt. If this wording
> changes in code, update this doc in the same PR — the two must not drift.

## 7. Output Format

**Contract expected from the LLM** (what the model must return, parsed by
`llm.controller.ts`):

| Field | Type | Description |
|---|---|---|
| `suggestedClassification` | `VendorClassification` (enum) | One of the five categories |
| `confidence` | `"low" \| "medium" \| "high"` | Model's self-reported confidence |
| `reasoning` | `string` | 2–3 sentence justification |
| `evidenceUsed` | `string[]` | Short phrases citing input evidence |

Example:

```json
{
  "suggestedClassification": "SI_COMPANY",
  "confidence": "medium",
  "reasoning": "The vendor's tech stack and notes emphasize enterprise system integration work rather than owned products.",
  "evidenceUsed": ["ERP integration", "10+ years enterprise clients"]
}
```

**Final HTTP response** (what the API actually returns — one field added
server-side, not requested from the model):

| Field | Added by |
|---|---|
| `suggestedClassification`, `confidence`, `reasoning`, `evidenceUsed` | LLM, parsed as-is |
| `disclaimer` | Appended in `llm.controller.ts` after parsing — **not** part of the model's own output |

> **[AI note]:** `confidence` as a three-value enum (rather than, say, a
> numeric 0–1 score) and the exact `disclaimer` wording are both invented.
> Neither is in the PDF. Malformed JSON or an invalid enum value from the
> model results in a `400 Bad Request` — chosen over silently defaulting to
> some fallback classification, since a silent wrong guess is worse than a
> visible error. This error-handling choice is also not spec text.

## 8. Verification Method

This endpoint has **no database write path** — that's structural, not just
a rule. Applying a suggestion requires a separate, explicit call:

PATCH /api/vendors/{id}/classification
{
"newClassification": "<value from suggestedClassification>",
"reason": "LLM-suggested (confidence: medium); reviewed by <member name>"
}


That second call is guarded to `ADMIN`/`DEVELOPER`, and writes both the new
`vendor.classification` value and a `classification_histories` row in a
single transaction — so the audit trail always shows a human,
identified by `changedBy`, as the one who applied the change, even when a
suggestion originated from this endpoint.

REVIEWER can read the resulting classification and its history
(`GET /api/vendors/{id}/classification-history`) but cannot trigger a new
LLM suggestion or apply one.

> **[AI note]:** pre-filling the `reason` field with LLM-suggestion context
> (as shown above) is a suggested convention, not enforced anywhere in
> code — nothing stops a reviewer from writing a different reason, or
> ignoring the suggestion outright. That's intentional (keeps the human in
> control) but worth stating explicitly here since it's the actual
> mechanism satisfying rule 7.

## 9. Open Items for Team Review

- [ ] Confirm the 5-field input list (§4) is sufficient, or should include `location`/`companySize`
- [ ] Resolve the `serviceType`-as-input circularity with Cường/My
- [ ] Confirm `confidence` as low/medium/high vs. a numeric score
- [ ] Confirm REVIEWER exclusion from this endpoint is correct (currently inferred, not explicit in the PDF)
- [ ] Confirm error status for a failed upstream LLM call (currently 500 — 502 may read better)
- [ ] Confirm `LLM_API_KEY` / `LLM_MODEL` env var ownership and add to `.env.example`