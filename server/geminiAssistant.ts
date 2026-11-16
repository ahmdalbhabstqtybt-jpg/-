import { GoogleGenAI, ThinkingLevel, type Content } from '@google/genai';
import { GAZA_INSTITUTIONS } from '../src/lib/gazaUniversities.ts';
import type { AssistantRole, GroundingSource } from '../src/types/dirasati.ts';

export interface AssistantChatRequest {
  message: string;
  history?: Array<{ role: 'user' | 'model'; text: string }>;
  assistantRole?: AssistantRole;
  useSearch?: boolean;
  context?: {
    university?: string;
    faculty?: string;
    department?: string;
    majorLabel?: string;
    academicYear?: number;
    activeMaterialTitle?: string;
    activeMaterialCourse?: string;
  };
}

export interface AssistantChatResult {
  reply: string;
  modelUsed: string;
  usedSearch: boolean;
  sources: GroundingSource[];
  searchFallbackReason?: string;
}

class AssistantServiceError extends Error {
  statusCode: number;
  constructor(message: string, statusCode = 500) {
    super(message);
    this.name = 'AssistantServiceError';
    this.statusCode = statusCode;
  }
}

function getGenAIClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new AssistantServiceError(
      'مفتاح الخدمة غير مهيأ حالياً. يرجى التأكد من إعداد GEMINI_API_KEY في لوحة Settings > Secrets.',
      400,
    );
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function buildSystemInstruction(
  assistantRole: AssistantRole,
  context?: AssistantChatRequest['context'],
): string {
  const gazaSummary = GAZA_INSTITUTIONS.map(
    (inst) =>
      `- ${inst.name} (${inst.category === 'university' ? 'جامعة' : 'كلية'}): ${inst.deanships
        .map((d) => d.name)
        .join('، ')}`,
  ).join('\n');

  const studentCtxLines = [
    context?.university ? `الجامعة / الكلية الحالية: ${context.university}` : null,
    context?.faculty ? `العمادة / الكلية الحالية: ${context.faculty}` : null,
    context?.department ? `القسم / التخصص الدقيق: ${context.department}` : null,
    context?.majorLabel ? `المسار الأكاديمي: ${context.majorLabel}` : null,
    context?.academicYear ? `السنة الدراسية: السنة ${context.academicYear}` : null,
    context?.activeMaterialTitle
      ? `الملف الذي يتصفحه الطالب حالياً: ${context.activeMaterialTitle}${
          context.activeMaterialCourse ? ` (${context.activeMaterialCourse})` : ''
        }`
      : null,
  ]
    .filter(Boolean)
    .join('\n');

  const roleDirective: Record<AssistantRole, string> = {
    advisor:
      'دورك: المرشد الأكاديمي المختص بجامعات وكليات قطاع غزة وعماداتها وأقسامها. ساعد الطالب في فهم شروط العمادات، المسارات الدراسية، والتوجيه الأكاديمي.',
    tutor:
      'دورك: مدرّس جامعي خبير يشرح المفاهيم والمساقات بوضوح وتدرج منطقي، ويحل مسائل السنوات السابقة، ويصمم خطط مراجعة عملية متناسبة مع العمادة والقسم والتخصص.',
    fast_reviewer:
      'دورك: مساعد مراجعة سريع ودقيق. قدّم إجابات مختصرة جداً، تعريفات مركزة، أسئلة تدريب سريعة، ونقاط مراجعة حاسمة قبل الامتحان بأقل إطالة.',
  };

  return [
    'أنت المساعد الأكاديمي لمنصة «دراستي» المخصصة لطلبة جامعات وكليات قطاع غزة.',
    roleDirective[assistantRole],
    'استجب دائماً بلغة عربية فصحى واضحة ومرتبة مع استخدام المصطلحات العلمية الإنجليزية بين قوسين عند الحاجة.',
    studentCtxLines ? `\nسياق الطالب الحالي:\n${studentCtxLines}` : '',
    `\nدليل الجامعات والكليات المعتمدة في قطاع غزة وعماداتها:\n${gazaSummary}`,
  ]
    .filter(Boolean)
    .join('\n');
}

function extractGroundingSources(response: {
  candidates?: Array<{
    groundingMetadata?: {
      groundingChunks?: Array<{
        web?: { uri?: string; title?: string };
      }>;
    };
  }>;
}): GroundingSource[] {
  const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
  if (!Array.isArray(chunks)) return [];
  const seen = new Set<string>();
  const sources: GroundingSource[] = [];
  for (const chunk of chunks) {
    const uri = chunk?.web?.uri?.trim();
    if (!uri || seen.has(uri)) continue;
    seen.add(uri);
    sources.push({
      uri,
      title: chunk?.web?.title?.trim() || uri,
    });
  }
  return sources.slice(0, 6);
}

function getErrorStatus(err: unknown): number | undefined {
  const status = (err as { status?: number })?.status;
  if (typeof status === 'number') return status;
  const rawMsg = err instanceof Error ? err.message : String(err);
  if (/\b(API_KEY_INVALID|PERMISSION_DENIED)\b/i.test(rawMsg)) return 403;
  if (/\bRESOURCE_EXHAUSTED\b/i.test(rawMsg)) return 429;
  if (/\bNOT_FOUND\b/i.test(rawMsg)) return 404;
  if (/\bUNAVAILABLE\b/i.test(rawMsg)) return 503;
  return undefined;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function sendWithConfig(
  ai: GoogleGenAI,
  model: string,
  history: Content[],
  systemInstruction: string,
  message: string,
  assistantRole: AssistantRole,
  enableSearch: boolean,
) {
  const thinkingConfig =
    model === 'gemini-3.1-flash-lite'
      ? { thinkingLevel: ThinkingLevel.MINIMAL }
      : {
          thinkingLevel:
            assistantRole === 'tutor' ? ThinkingLevel.MEDIUM : ThinkingLevel.LOW,
        };

  const chat = ai.chats.create({
    model,
    history,
    config: {
      systemInstruction,
      thinkingConfig,
      ...(enableSearch ? { tools: [{ googleSearch: {} }] } : {}),
    },
  });

  return chat.sendMessage({ message });
}

export async function runAcademicAssistantChat(
  req: AssistantChatRequest,
): Promise<AssistantChatResult> {
  const message = (req.message || '').trim();
  if (!message) {
    throw new AssistantServiceError('يرجى كتابة سؤالك أو استفسارك الأكاديمي.', 400);
  }

  const assistantRole: AssistantRole = req.assistantRole || 'advisor';
  const requestedSearch = Boolean(req.useSearch);

  const primaryModel =
    assistantRole === 'fast_reviewer' && !requestedSearch
      ? 'gemini-3.1-flash-lite'
      : 'gemini-4-hydrogen';

  const ai = getGenAIClient();

  const formattedHistory: Content[] = (req.history || [])
    .filter((item) => item && typeof item.text === 'string' && item.text.trim())
    .slice(-16)
    .map((item) => ({
      role: item.role === 'model' ? 'model' : 'user',
      parts: [{ text: item.text.trim() }],
    }));

  const systemInstruction = buildSystemInstruction(assistantRole, req.context);

  const attempts: Array<{ model: string; enableSearch: boolean; fallbackReason?: string }> = [
    { model: primaryModel, enableSearch: requestedSearch },
  ];

  if (requestedSearch) {
    attempts.push({
      model: 'gemini-4-hydrogen',
      enableSearch: false,
      fallbackReason:
        'البحث المباشر غير متاح مؤقتاً ضمن حصة المفتاح الحالية، وتمت الإجابة عبر الدليل الأكاديمي المعتمد.',
    });
  }

  if (primaryModel !== 'gemini-3.1-flash-lite') {
    attempts.push({
      model: 'gemini-3.1-flash-lite',
      enableSearch: false,
      fallbackReason: requestedSearch
        ? 'تم التحويل تلقائياً للوضع السريع نظراً لبلوغ حد البحث المباشر مؤقتاً.'
        : undefined,
    });
  }

  let lastError: unknown = null;

  for (let i = 0; i < attempts.length; i += 1) {
    const attempt = attempts[i];
    // Brief exponential backoff retry once if we get a transient 503/429 without search fallback
    for (let retry = 0; retry < 2; retry += 1) {
      try {
        const response = await sendWithConfig(
          ai,
          attempt.model,
          formattedHistory,
          systemInstruction,
          message,
          assistantRole,
          attempt.enableSearch,
        );
        const replyText = (response.text || '').trim();
        if (!replyText) {
          throw new AssistantServiceError(
            'لم يتمكن المساعد من توليد رد واضح حالياً. حاول إعادة صياغة السؤال.',
            502,
          );
        }

        return {
          reply: replyText,
          modelUsed: attempt.model,
          usedSearch: attempt.enableSearch,
          sources: attempt.enableSearch ? extractGroundingSources(response) : [],
          ...(attempt.fallbackReason ? { searchFallbackReason: attempt.fallbackReason } : {}),
        };
      } catch (err) {
        lastError = err;
        const status = getErrorStatus(err);

        // Auth/permission issues cannot be resolved by retrying or switching models
        if (status === 401 || status === 403) {
          throw new AssistantServiceError(
            'تعذر التحقق من صلاحية مفتاح Gemini API. يرجى مراجعة الإعدادات في لوحة Settings > Secrets.',
            403,
          );
        }

        // If googleSearch hit 429 quota immediately, skip retrying search and move directly to non-search fallback
        if (attempt.enableSearch && (status === 429 || status === 400)) {
          break;
        }

        if ((status === 429 || status === 503) && retry === 0) {
          await sleep(450);
          continue;
        }

        break;
      }
    }
  }

  const finalStatus = getErrorStatus(lastError);
  if (finalStatus === 429) {
    throw new AssistantServiceError(
      'تم تجاوز حد الطلبات المؤقت لواجهة الذكاء الاصطناعي. يرجى الانتظار قليلاً أو ترقية المفتاح في Settings > Secrets.',
      429,
    );
  }
  if (finalStatus === 404) {
    throw new AssistantServiceError(
      'النموذج المطلوب غير متاح حالياً. يرجى المحاولة مجدداً بعد قليل.',
      404,
    );
  }
  throw lastError instanceof Error
    ? new AssistantServiceError(lastError.message, finalStatus || 500)
    : new AssistantServiceError('تعذر الاتصال بالمساعد الأكاديمي حالياً.', 500);
}
