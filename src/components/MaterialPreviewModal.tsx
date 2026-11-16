import React, { useState } from 'react';
import { CheckCircle2, Lock, Sparkles, Star, X } from 'lucide-react';
import {
  ACCESS_TIER_LABELS,
  MAJOR_LABELS,
  MATERIAL_TYPE_LABELS,
  canAccessMaterial,
} from '../lib/constants';
import type { StudentProfile, StudyMaterial } from '../types/dirasati';

interface MaterialPreviewModalProps {
  material: StudyMaterial | null;
  profile: StudentProfile;
  onClose: () => void;
  onSubmitReview: (materialId: string, rating: number, comment: string) => Promise<void>;
  onGoToSubscriptions: () => void;
  onRedeemPoints: () => Promise<void>;
}

export const MaterialPreviewModal: React.FC<MaterialPreviewModalProps> = ({
  material,
  profile,
  onClose,
  onSubmitReview,
  onGoToSubscriptions,
  onRedeemPoints,
}) => {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [downloaded, setDownloaded] = useState(false);

  if (!material) return null;

  const hasAccess = canAccessMaterial(profile.planId, material.accessTier);

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) return;
    setSubmitting(true);
    try {
      await onSubmitReview(material.id, rating, comment.trim());
      setComment('');
      setRating(5);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="material-modal-title"
    >
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
              <span className="font-semibold text-[#2563EB]">{MAJOR_LABELS[material.majorId]}</span>
              <span aria-hidden="true">·</span>
              <span>{material.university}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono-nums">{material.courseCode}</span>
              <span aria-hidden="true">·</span>
              <span>{MATERIAL_TYPE_LABELS[material.type]}</span>
              <span aria-hidden="true">·</span>
              <span>{material.pagesOrDuration}</span>
            </div>
            <h2 id="material-modal-title" className="font-display text-xl font-bold text-[#0F172A]">
              {material.title}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق نافذة المعاينة"
            className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Author & Trust Summary */}
          <div className="space-y-3 pb-4 border-b border-slate-100">
            <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
              <div className="flex items-center gap-2 text-slate-700">
                <CheckCircle2
                  className={`w-4 h-4 shrink-0 ${
                    material.verified ? 'text-[#059669]' : 'text-[#D97706]'
                  }`}
                />
                <span>
                  إعداد: <strong>{material.authorName}</strong>
                </span>
                {material.verified && (
                  <span className="text-slate-500">
                    ·{' '}
                    {material.authorRole === 'instructor'
                      ? 'محتوى أكاديمي رسمي'
                      : 'مقيّم ومعتمد من معلم المادة'}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5 font-mono-nums font-semibold text-[#0F172A]">
                <Star className="w-4 h-4 fill-[#D97706] text-[#D97706]" />
                <span>{material.ratingAvg > 0 ? material.ratingAvg.toFixed(1) : '—'}</span>
                <span className="text-xs font-normal text-slate-500">
                  ({material.ratingCount} تقييم)
                </span>
              </div>
            </div>

            {material.fileName && (
              <div className="text-xs text-slate-600 font-mono-nums">
                الملف المرفق: <strong className="text-[#0F172A]">{material.fileName}</strong>
              </div>
            )}

            {material.authorRole === 'student' && (
              <div
                className={`p-3 rounded-xl border text-xs space-y-1 ${
                  material.evaluationStatus === 'evaluated'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : material.evaluationStatus === 'needs_revision'
                      ? 'bg-red-50 border-red-200 text-red-900'
                      : 'bg-[#FFFBEB] border-[#FDE68A] text-[#92400E]'
                }`}
              >
                <div className="font-semibold flex flex-wrap items-center justify-between gap-2">
                  <span>
                    {material.evaluationStatus === 'evaluated'
                      ? `مقيّم من معلم المادة (${material.evaluatedBy || 'معلم المساق'})`
                      : material.evaluationStatus === 'needs_revision'
                        ? `ملاحظة معلم المادة (${material.evaluatedBy || 'معلم المساق'}) — يحتاج تعديلاً`
                        : 'بانتظار تقييم معلم المادة ومنح النقاط المستحقة'}
                  </span>
                  {material.evaluationStatus === 'evaluated' && (
                    <span className="font-mono-nums font-bold text-[#059669]">
                      +{material.teacherPointsAwarded || 0} نقطة ممنوحة للطالب
                    </span>
                  )}
                </div>
                {material.teacherEvaluationNote && (
                  <p className="leading-relaxed opacity-90">{material.teacherEvaluationNote}</p>
                )}
              </div>
            )}
          </div>

          {/* Academic Preview Box */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-base font-bold text-[#0F172A]">
                مقتطف المعاينة الدراسية
              </h3>
              <span className="text-xs text-slate-500 font-mono-nums">
                آخر تحديث: {material.updatedAt}
              </span>
            </div>

            <div className="bg-[#F8FAFC] border border-slate-200 rounded-xl p-5 space-y-3">
              {(hasAccess ? material.previewContent : material.previewContent.slice(0, 1)).map(
                (line, idx) => (
                  <p key={idx} className="text-sm sm:text-base text-slate-800 leading-relaxed">
                    {line}
                  </p>
                ),
              )}

              {!hasAccess && (
                <div className="mt-4 pt-4 border-t border-slate-200 space-y-3">
                  <div className="flex items-start gap-2.5 text-sm text-[#92400E]">
                    <Lock className="w-4 h-4 text-[#D97706] mt-0.5 shrink-0" />
                    <span>
                      هذا الملف الكامل متاح ضمن <strong>{ACCESS_TIER_LABELS[material.accessTier]}</strong>.
                      تم عرض جزء أولي للمعاينة فقط في الخطة المجانية المحدودة.
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onGoToSubscriptions();
                      }}
                      className="px-4 py-2 text-xs font-semibold text-white bg-[#2563EB] hover:bg-[#1D4ED8] rounded-lg transition-colors"
                    >
                      ترقية الاشتراك الآن
                    </button>

                    {profile.points >= 100 ? (
                      <button
                        type="button"
                        onClick={onRedeemPoints}
                        className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#059669] hover:bg-[#047857] rounded-lg transition-colors"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>فتح باستبدال 100 نقطة (رصيدك {profile.points})</span>
                      </button>
                    ) : (
                      <span className="text-xs text-slate-600">
                        اجمع {100 - profile.points} نقطة إضافية برفع ملخص لفتح هذا المحتوى مجاناً
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {hasAccess && (
              <div className="flex items-center justify-between pt-1">
                <span className="text-xs text-slate-500 font-mono-nums">
                  عدد التحميلات: {material.downloadsCount + (downloaded ? 1 : 0)}
                </span>
                <button
                  type="button"
                  onClick={() => setDownloaded(true)}
                  className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${
                    downloaded
                      ? 'bg-emerald-50 text-[#059669] border border-emerald-200'
                      : 'bg-[#2563EB] hover:bg-[#1D4ED8] text-white'
                  }`}
                >
                  {downloaded ? 'تم حفظ نسخة المراجعة بنجاح' : 'تحميل الملف الكامل'}
                </button>
              </div>
            )}
          </div>

          {/* Student Ratings & Reviews */}
          <div className="pt-4 border-t border-slate-200 space-y-4">
            <h3 className="font-display text-base font-bold text-[#0F172A]">
              تقييمات الطلبة للملف ({material.reviews.length})
            </h3>

            <form onSubmit={handleReviewSubmit} className="bg-[#F8FAFC] border border-slate-200 rounded-xl p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-semibold text-slate-700">أضف تقييمك بالنجوم:</span>
                <div className="flex items-center gap-1" role="radiogroup" aria-label="التقييم بالنجوم">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      aria-label={`${star} نجوم`}
                      className="p-1 rounded hover:bg-slate-200/70 transition-colors"
                    >
                      <Star
                        className={`w-5 h-5 ${
                          star <= rating ? 'fill-[#D97706] text-[#D97706]' : 'text-slate-300'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="اكتب رأيك حول وضوح الملخص ودقته..."
                  className="flex-1 h-10 px-3 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                />
                <button
                  type="submit"
                  disabled={submitting || !comment.trim()}
                  className="px-4 h-10 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 rounded-lg transition-colors whitespace-nowrap shrink-0"
                >
                  {submitting ? 'جارٍ النشر...' : 'نشر التقييم'}
                </button>
              </div>
            </form>

            {material.reviews.length === 0 ? (
              <p className="text-sm text-slate-500">لا توجد تعليقات بعد. كن أول طالب يقيّم هذا الملف.</p>
            ) : (
              <ul className="space-y-3">
                {material.reviews.map((rev) => (
                  <li key={rev.id} className="pb-3 border-b border-slate-100 last:border-b-0">
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span className="font-semibold text-[#0F172A]">{rev.studentName}</span>
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-0.5 text-[#D97706] font-mono-nums font-semibold">
                          <Star className="w-3.5 h-3.5 fill-[#D97706]" />
                          {rev.rating}
                        </span>
                        <span className="font-mono-nums">{rev.createdAt}</span>
                      </div>
                    </div>
                    <p className="text-sm text-slate-700 mt-1">{rev.comment}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
