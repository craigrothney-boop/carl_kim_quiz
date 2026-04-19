import {
  GoogleGenerativeAI,
  SchemaType,
  type ResponseSchema,
} from "@google/generative-ai";
import { z } from "zod";
import { createQuestion } from "@/lib/firestore-repo";
import { normalizePrompt, normalizeTopicTag } from "@/lib/question-topic";
import type { Subject } from "@/types/app";

const itemSchema = z.object({
  topic: z.string().min(2).max(80),
  prompt: z.string().min(4),
  optionA: z.string().min(1),
  optionB: z.string().min(1),
  optionC: z.string().min(1),
  optionD: z.string().min(1),
  correctIndex: z.number().int().min(0).max(3),
});

const batchSchema = z
  .object({
    questions: z.array(itemSchema).min(1),
  })
  .superRefine((data, ctx) => {
    const tags = data.questions.map((q) => normalizeTopicTag(q.topic));
    const seen = new Set<string>();
    for (let i = 0; i < tags.length; i++) {
      const t = tags[i]!;
      if (!t) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Empty topic tag after normalisation",
          path: ["questions", i, "topic"],
        });
        continue;
      }
      if (seen.has(t)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Duplicate topic tag in batch: ${t}`,
          path: ["questions", i, "topic"],
        });
      }
      seen.add(t);
    }
  });

/** Structured output schema for Gemini JSON mode (2.5+); matches Zod validation below. */
const QUESTION_BATCH_RESPONSE_SCHEMA: ResponseSchema = {
  type: SchemaType.OBJECT,
  properties: {
    questions: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          topic: { type: SchemaType.STRING },
          prompt: { type: SchemaType.STRING },
          optionA: { type: SchemaType.STRING },
          optionB: { type: SchemaType.STRING },
          optionC: { type: SchemaType.STRING },
          optionD: { type: SchemaType.STRING },
          correctIndex: { type: SchemaType.INTEGER },
        },
        required: [
          "topic",
          "prompt",
          "optionA",
          "optionB",
          "optionC",
          "optionD",
          "correctIndex",
        ],
      },
    },
  },
  required: ["questions"],
};

const SHARED_RULES = `You write multiple-choice questions for UK primary school pupils (Scotland P1–P7). Year 1 means P1 (roughly age 5) through year 7 means P7 (age 11–12). Be age-appropriate, encouraging, and never frightening or patronising. Each question has exactly four options and one correct answer. Output must follow the requested JSON shape only—no markdown fences, no commentary outside the JSON object.`;

/** Strict numeracy scope per Scottish primary stage (P1–P7). Used only when subject is MATHS. */
const MATHS_CURRICULUM_BY_YEAR: Record<
  number,
  { label: string; allowed: string; variety: string }
> = {
  1: {
    label: "P1",
    allowed: `ONLY these: addition and subtraction with results within 10; counting objects or small sets; comparing "how many" (which is more/fewer). Do NOT use multiplication, division, fractions beyond halves as vocabulary only if tied to sharing, large numbers, column methods, money beyond 1–10p in simple count contexts, or formal time calculations.`,
    variety: `Mix at least: one pure +/- within 10, one counting or "how many" style, and word problems that stay within these limits.`,
  },
  2: {
    label: "P2",
    allowed: `Addition and subtraction within 20; number bonds to 10 and 20; simple missing-number within 20 (e.g. ? + 6 = 14). Do NOT use times tables beyond counting in 2s if needed, formal long multiplication/division, fractions beyond halves/quarters as sharing, or numbers well above 20 for the core calculation.`,
    variety: `Mix number bonds, straight calculations, and short word problems—all within P2 limits.`,
  },
  3: {
    label: "P3",
    allowed: `Addition and subtraction up to 100; introduction to 2×, 5×, and 10× tables (and related division facts); simple fractions (halves 1/2 and quarters 1/4) of shapes or small sets. Do NOT use long multiplication, complex fractions, or formal decimals beyond recognising 0.5 as a half if appropriate.`,
    variety: `Include a mix: +/- near 100, a times-table or simple multiplication fact, a simple fraction question, and a short word problem.`,
  },
  4: {
    label: "P4",
    allowed: `Times tables up to 10×10; column addition and subtraction; basic money (coins, change in sensible amounts) and time (reading clocks, simple durations). Do NOT use long division, multiplying 2-digit by 2-digit, or advanced fractions/decimals beyond P4 level.`,
    variety: `Balance: table fact / short multiplication, column +/-, money OR time, and a word problem using one of these.`,
  },
  5: {
    label: "P5",
    allowed: `Multiplication (e.g. 2-digit × 1-digit) and division (with remainders or clean splits where appropriate); equivalent fractions; introduction to decimals (tenths; simple ordering/adding in context); perimeter and area of simple rectangles on a grid or with given lengths.`,
    variety: `Do NOT default to addition. Spread questions across: multiplication or division, fractions or decimals, measurement (perimeter or area), and at least one multi-step word problem suitable for P5.`,
  },
  6: {
    label: "P6",
    allowed: `Long multiplication and division; adding and subtracting decimals and fractions (common denominators or simple cases); percentages such as 10%, 25%, 50%; angles (acute/obtuse/right, estimating or measuring context).`,
    variety: `Balance: long mult OR long division, fraction/decimal +/-, a percentage question, and an angles or geometry-in-context question where appropriate.`,
  },
  7: {
    label: "P7",
    allowed: `Complex word problems combining operations; basic algebra (find the missing number in simple equations); negative numbers in context; ratios and proportional reasoning at an introductory level.`,
    variety: `Include varied structures: combined-operation word problems, a missing-number/algebra style item, and ratio or negative-number reasoning—do not lean on single-operation drills.`,
  },
};

function clampPrimaryYear(year: number): number {
  if (Number.isNaN(year)) return 4;
  return Math.min(7, Math.max(1, Math.round(year)));
}

function buildMathsCurriculumBlock(targetYear: number): string {
  const y = clampPrimaryYear(targetYear);
  const row = MATHS_CURRICULUM_BY_YEAR[y]!;
  return `

## Maths curriculum map (mandatory — target stage: ${row.label}, app target year ${y})

You MUST generate questions whose mathematical demand strictly matches this stage. Do not use skills from later stages. Do not simplify older classes to "only easy addition" unless the map for that stage limits you to addition and subtraction.

**Allowed content for ${row.label}:**
${row.allowed}

**Variety within this batch:**
${row.variety}

**Anti-default rule:** Multiple-choice numeracy must reflect the breadth above. If you notice you have written several addition-only items, STOP and replace some with other permitted operations for ${row.label}. Topic tags should reflect the skill (e.g. p5_area_rectangle, p3_fractions_quarter, p6_percent_25).`;
}

function buildMathsBatchVarietyHint(count: number, targetYear: number): string {
  if (count <= 1) return "";
  const y = clampPrimaryYear(targetYear);
  const row = MATHS_CURRICULUM_BY_YEAR[y]!;
  return `

Batch variety (this batch has ${count} questions): You must cover a balanced spread of the operations allowed for ${row.label}. Do not output ${count} questions that are all the same type (e.g. all single-step addition). Vary structures: different topics and different skills from the curriculum map (e.g. where the map allows it, include one multiplication-focused item, one fraction/decimals/measurement item as applicable, and one word problem).`;
}

const MAX_PROMPTS_IN_LIST = 40;
const MAX_TOPICS_IN_LIST = 60;
const MAX_FINGERPRINTS_IN_LIST = 80;
const MAX_PROMPT_CHARS = 420;

function truncatePromptLine(s: string): string {
  const t = s.trim();
  if (!t) return "";
  return t.length <= MAX_PROMPT_CHARS ? t : `${t.slice(0, MAX_PROMPT_CHARS)}…`;
}

/** Appends de-duplication guidance when the current quiz already has question text. */
function buildAvoidSimilarPromptsBlock(existingPrompts: string[]): string {
  const unique = [
    ...new Set(
      existingPrompts.map(truncatePromptLine).filter((p) => p.length > 0),
    ),
  ].slice(0, MAX_PROMPTS_IN_LIST);
  if (unique.length === 0) return "";

  const numbered = unique.map((p, i) => `${i + 1}. ${p}`).join("\n");
  return `

Do not generate questions that are semantically similar to this list of existing questions already in the current quiz. Invent genuinely new topics—do not rephrase or lightly tweak the same fact (for example, if "capital of Scotland" or Edinburgh already appears below, choose a different theme entirely):

${numbered}`;
}

function buildAvoidUsedTopicTagsBlock(existingTopicTags: string[]): string {
  const unique = [
    ...new Set(
      existingTopicTags.map((t) => normalizeTopicTag(t)).filter((t) => t.length > 0),
    ),
  ].slice(0, MAX_TOPICS_IN_LIST);
  if (unique.length === 0) return "";

  const listed = unique.map((t, i) => `${i + 1}. ${t}`).join("\n");
  return `

Topic tags (mandatory): Every question MUST include a unique "topic" field: a short snake_case English tag naming the subject area (e.g. scottish_capitals, fractions_halves, solar_system_planets). Tags must be distinct from each other in this response.

Do not use any topic tag that appears in the following list — these topic areas are already represented in the current quiz. Choose different themes:

${listed}`;
}

/**
 * Hard negative constraints: normalized prompt fingerprints already in this quiz run.
 * The model must not produce wording that collapses to the same fingerprint (exact text identity).
 */
function buildNegativeFingerprintsBlock(fingerprints: string[]): string {
  const unique = [
    ...new Set(fingerprints.map((f) => f.trim().toLowerCase()).filter((f) => f.length > 0)),
  ].slice(0, MAX_FINGERPRINTS_IN_LIST);
  if (unique.length === 0) return "";

  const listed = unique.map((f, i) => `${i + 1}. ${f}`).join("\n");
  return `

Negative constraints (fingerprint deduplication): Each line below is a "fingerprint" — the question prompt lowercased with all spaces and punctuation removed, leaving only letters and digits concatenated. You MUST NOT write any question whose prompt would produce the same fingerprint as any entry below. Do not paraphrase lightly to sneak past this list: change the underlying task or numbers so the fingerprint is genuinely different.

${listed}`;
}

/** System instruction depends on subject: Maths → Carl, GK → Kim (must match generation slot). */
function buildSystemInstruction(
  subject: Subject,
  targetYear: number,
  existingPrompts: string[],
  existingTopicTags: string[],
  existingPromptFingerprints: string[],
): string {
  const topicRules = `Each question object must include a "topic" string: lowercase words separated by underscores (snake_case), 2–64 characters, describing the factual theme only (no mascot names in the tag). Every topic in this batch must be unique and must not match any tag in the "already used" list below.`;

  const fpBlock = buildNegativeFingerprintsBlock(existingPromptFingerprints);

  if (subject === "MATHS") {
    return `You are Carl, the maths mascot for this quiz app. Stay in Carl's persona for every question in this batch—do not switch to Kim.

Carl is energetic and positive about numbers and reasoning. He uses short, natural phrases like "Let's crunch the numbers!" or "Great job with the logic!" (vary the wording; do not repeat the same catchphrase every time). He focuses on clear, encouraging steps and makes numeracy feel doable and fun.

${topicRules}

${SHARED_RULES}${buildMathsCurriculumBlock(targetYear)}${buildAvoidSimilarPromptsBlock(existingPrompts)}${buildAvoidUsedTopicTagsBlock(existingTopicTags)}${fpBlock}`;
  }

  return `You are Kim, the general-knowledge mascot for this quiz app. Stay in Kim's persona for every question in this batch—do not switch to Carl.

Kim is curious and enthusiastic about facts. She uses warm phrases like "Did you know...?" or "That's a fascinating bit of history!" (vary the wording; do not repeat the same opener every time). She loves sharing interesting tidbits in a friendly, primary-school-appropriate way.

${topicRules}

${SHARED_RULES}${buildAvoidSimilarPromptsBlock(existingPrompts)}${buildAvoidUsedTopicTagsBlock(existingTopicTags)}${fpBlock}`;
}

function getGenAI(): GoogleGenerativeAI | null {
  const key = process.env.GOOGLE_AI_API_KEY?.trim();
  if (!key) return null;
  return new GoogleGenerativeAI(key);
}

export async function generateAndStoreQuestions(params: {
  subject: Subject;
  targetYear: number;
  count: number;
  /** Prompts of questions already placed in this quiz (avoid semantically similar topics). */
  existingPromptsInQuiz?: string[];
  /** Normalised topic tags already used in this quiz (must not repeat). */
  existingTopicsInQuiz?: string[];
  /**
   * Normalized prompt fingerprints already in this quiz (see normalizePrompt in question-topic).
   * Passed to the model as negative constraints; stored rows must not match these.
   */
  existingPromptFingerprints?: string[];
}): Promise<string[]> {
  const genAI = getGenAI();
  if (!genAI) {
    throw new Error(
      "GOOGLE_AI_API_KEY is not set. Add it to enable AI question generation when the bank runs low.",
    );
  }

  const topicHint =
    params.subject === "MATHS"
      ? (() => {
          const s = clampPrimaryYear(params.targetYear);
          return `numeracy that strictly follows the Maths Curriculum Map in your system instructions for P${s} (curriculum stage ${s}). Use the full range of permitted operations for that stage—not addition only.`;
        })()
      : "general knowledge (science, nature, geography, books, sport, UK context where natural).";

  const personaLine =
    params.subject === "MATHS"
      ? "This batch is for MATHS slots only—write every question in Carl's voice as defined in your system instructions."
      : "This batch is for GENERAL KNOWLEDGE slots only—write every question in Kim's voice as defined in your system instructions.";

  const existingPrompts = params.existingPromptsInQuiz ?? [];
  const existingTopics = params.existingTopicsInQuiz ?? [];
  const existingFingerprints = params.existingPromptFingerprints ?? [];

  const mathsBatchExtra =
    params.subject === "MATHS"
      ? buildMathsBatchVarietyHint(params.count, params.targetYear)
      : "";

  const userText = `Create ${params.count} questions for subject "${params.subject}" at target year ${params.targetYear}. ${personaLine} Focus on ${topicHint} Vary topics.${mathsBatchExtra}

Each item must include: "topic" (unique snake_case tag, not in the used-topics list from your instructions), "prompt", four options, and "correctIndex" (0–3).

Return a single JSON object: {"questions":[{"topic","prompt","optionA","optionB","optionC","optionD","correctIndex"}, ...]}.`;

  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    systemInstruction: buildSystemInstruction(
      params.subject,
      params.targetYear,
      existingPrompts,
      existingTopics,
      existingFingerprints,
    ),
  });

  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: userText }] }],
    generationConfig: {
      temperature: 0.9,
      topP: 0.95,
      topK: 64,
      maxOutputTokens: 8192,
      responseMimeType: "application/json",
      responseSchema: QUESTION_BATCH_RESPONSE_SCHEMA,
    },
  });

  const raw = result.response.text();
  if (!raw?.trim()) throw new Error("No content from model");

  const parsed = batchSchema.parse(JSON.parse(raw));

  const blockedTopics = new Set(existingTopics.map((t) => normalizeTopicTag(t)));
  const blockedFingerprints = new Set(
    existingFingerprints.map((f) => normalizePrompt(f)).filter((f) => f.length > 0),
  );
  const ids: string[] = [];

  for (const q of parsed.questions) {
    if (ids.length >= params.count) break;
    const tag = normalizeTopicTag(q.topic);
    const fp = normalizePrompt(q.prompt);
    if (!tag || blockedTopics.has(tag) || blockedFingerprints.has(fp)) continue;
    blockedTopics.add(tag);
    blockedFingerprints.add(fp);

    const id = await createQuestion({
      subject: params.subject,
      topic: tag,
      prompt: q.prompt,
      optionA: q.optionA,
      optionB: q.optionB,
      optionC: q.optionC,
      optionD: q.optionD,
      correctIndex: q.correctIndex,
      targetYear: params.targetYear,
      source: "ai",
    });
    ids.push(id);
  }

  if (ids.length === 0) {
    throw new Error(
      "AI did not return any questions with acceptable unique topic tags.",
    );
  }

  return ids;
}
