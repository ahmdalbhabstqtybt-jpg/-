import type { AccessTier, MajorId, MaterialType, PlanId } from '../types/dirasati';

export const ALL_MAJOR_IDS: MajorId[] = [
  'engineering',
  'medicine',
  'pharmacy',
  'it',
  'business',
  'law',
  'education',
  'media',
  'sciences',
  'arts',
  'humanities',
  'sports',
];

export const MAJOR_LABELS: Record<MajorId, string> = {
  engineering: 'الهندسة والتخطيط العمراني',
  medicine: 'الطب والعلوم الصحية والتمريض',
  pharmacy: 'الصيدلة والعلوم الصيدلانية',
  it: 'تكنولوجيا المعلومات والحوسبة',
  business: 'الاقتصاد وإدارة الأعمال والمحاسبة',
  law: 'الحقوق والقانون والعلوم الأمنية',
  education: 'التربية والعلوم التربوية',
  media: 'الإعلام والاتصال الجماهيري',
  sciences: 'العلوم الطبيعية والرياضيات',
  arts: 'الفنون الجميلة والتصميم',
  humanities: 'اللغات والدراسات الإنسانية والاجتماعية',
  sports: 'التربية البدنية والرياضة',
};

export const MAJOR_DESCRIPTIONS: Record<MajorId, string> = {
  engineering: 'الهندسة المدنية، المعمارية، الكهربائية، هندسة الحاسوب، الصناعية، والميكاترونكس',
  medicine: 'الطب البشري، طب الأسنان، التمريض، القبالة، المختبرات الطبية، والعلاج الطبيعي',
  pharmacy: 'الكيمياء الصيدلانية، الصيدلانيات، علم الأدوية والسموم، العقاقير، والصيدلة السريرية',
  it: 'علوم الحاسوب، تطوير البرمجيات، أمن المعلومات، علم البيانات، الشبكات، والوسائط المتعددة',
  business: 'إدارة الأعمال، المحاسبة والتدقيق، العلوم المالية والمصرفية، الاقتصاد، والتسويق الرقمي',
  law: 'القانون العام والخاص، القانون الدولي والجنائي، الشريعة والقانون، والعلوم الشرطية والأمنية',
  education: 'أصول التربية، المناهج وطرق التدريس، علم النفس، الإرشاد النفسي، وتكنولوجيا التعليم',
  media: 'الصحافة الإلكترونية، الإذاعة والتلفزيون، العلاقات العامة، الإعلام الرقمي، واللغات والترجمة',
  sciences: 'الرياضيات، الفيزياء، الكيمياء، الأحياء والتكنولوجيا الحيوية، والجيولوجيا وعلوم البيئة',
  arts: 'الفنون التشكيلية، التصميم الجرافيكي، الديكور والتصميم الداخلي، الخزف والنحت، والتربية الفنية',
  humanities: 'الخدمة الاجتماعية، تنمية المجتمع، اللغة العربية، التاريخ والحضارة، والدراسات الإسلامية',
  sports: 'التدريب الرياضي، الإدارة الرياضية، الصحة والتأهيل الرياضي، والألعاب الجماعية والفردية',
};

export const MATERIAL_TYPE_LABELS: Record<MaterialType, string> = {
  lecture: 'محاضرة',
  summary: 'ملخص',
  past_exams: 'أسئلة سنوات سابقة',
  book: 'كتاب مرجعي',
  video: 'فيديو شرح',
};

export const ACCESS_TIER_LABELS: Record<AccessTier, string> = {
  free: 'متاح مجاناً',
  basic: 'الخطة الأساسية',
  full: 'الخطة الكاملة',
};

export const PLAN_LABELS: Record<PlanId, string> = {
  free: 'الخطة المجانية المحدودة',
  basic: 'الخطة الأساسية',
  full: 'الخطة الكاملة',
  annual: 'الخطة السنوية بخصم',
  instructor: 'خطة المدرّس والمساعد',
};

export function canAccessMaterial(planId: PlanId, tier: AccessTier): boolean {
  if (tier === 'free') return true;
  if (planId === 'full' || planId === 'annual' || planId === 'instructor') return true;
  if (planId === 'basic' && tier === 'basic') return true;
  return false;
}

export interface StudentRankTier {
  id: 'beginner' | 'active' | 'silver' | 'gold';
  level: number;
  title: string;
  minPoints: number;
  description: string;
}

export const STUDENT_RANK_TIERS: StudentRankTier[] = [
  {
    id: 'beginner',
    level: 1,
    title: 'طالب مبتدئ',
    minPoints: 0,
    description: 'بداية المسار — ارفع أول ملخص لتقييم المعلم وبدء جمع النقاط.',
  },
  {
    id: 'active',
    level: 2,
    title: 'مساهم نشط',
    minPoints: 50,
    description: 'مساهمات معتمدة تفيد طلبة تخصصك في المراجعة.',
  },
  {
    id: 'silver',
    level: 3,
    title: 'مساهم فضي',
    minPoints: 100,
    description: 'رصيد يؤهلك لاستبدال اشتراك مجاني في الخطة الكاملة.',
  },
  {
    id: 'gold',
    level: 4,
    title: 'مساهم ذهبي',
    minPoints: 200,
    description: 'أعلى رتبة للمساهمين المتميزين في جودة الملخصات.',
  },
];

export interface StudentRankInfo {
  current: StudentRankTier;
  next: StudentRankTier | null;
  progressPercent: number;
  pointsToNext: number;
}

export function getStudentRank(points: number): StudentRankInfo {
  const safePoints = Math.max(0, Math.floor(points || 0));
  let current = STUDENT_RANK_TIERS[0];
  for (const tier of STUDENT_RANK_TIERS) {
    if (safePoints >= tier.minPoints) {
      current = tier;
    }
  }
  const currentIdx = STUDENT_RANK_TIERS.findIndex((t) => t.id === current.id);
  const next = currentIdx < STUDENT_RANK_TIERS.length - 1 ? STUDENT_RANK_TIERS[currentIdx + 1] : null;
  if (!next) {
    return {
      current,
      next: null,
      progressPercent: 100,
      pointsToNext: 0,
    };
  }
  const span = Math.max(1, next.minPoints - current.minPoints);
  const gainedInTier = safePoints - current.minPoints;
  const progressPercent = Math.min(100, Math.max(0, Math.round((gainedInTier / span) * 100)));
  return {
    current,
    next,
    progressPercent,
    pointsToNext: Math.max(0, next.minPoints - safePoints),
  };
}
