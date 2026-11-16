import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  BookOpen,
  Building2,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  FileText,
  Flame,
  Lock,
  MapPin,
  Search,
  SlidersHorizontal,
  Star,
  Tag,
} from 'lucide-react';
import { MAJOR_COVER_IMAGES } from '../lib/assets';
import {
  ACCESS_TIER_LABELS,
  ALL_MAJOR_IDS,
  MAJOR_DESCRIPTIONS,
  MAJOR_LABELS,
  MATERIAL_TYPE_LABELS,
  canAccessMaterial,
} from '../lib/constants';
import {
  GAZA_INSTITUTIONS,
  getAllGazaDepartments,
  getDeanshipsForInstitution,
  getDepartmentsForDeanship,
  inferMajorFromGaza,
} from '../lib/gazaUniversities';
import type {
  CampusPartnerAd,
  MajorId,
  MaterialType,
  StudentProfile,
  StudyMaterial,
} from '../types/dirasati';

type SortMode = 'recommended' | 'most_active_dept' | 'newest';

interface MaterialsCatalogProps {
  materials: StudyMaterial[];
  profile: StudentProfile;
  universities: string[];
  partnerAds: CampusPartnerAd[];
  selectedMajorFilter: 'all' | 'my_courses' | MajorId;
  onChangeMajorFilter: (val: 'all' | 'my_courses' | MajorId) => void;
  selectedCourseFilter: string;
  onChangeCourseFilter: (course: string) => void;
  selectedUniversityFilter: string;
  onChangeUniversityFilter: (uni: string) => void;
  selectedFacultyFilter: string;
  onChangeFacultyFilter: (faculty: string) => void;
  selectedDepartmentFilter: string;
  onChangeDepartmentFilter: (dept: string) => void;
  onSelectMaterial: (material: StudyMaterial) => void;
  onOpenUpload: () => void;
  onGoToEvaluations?: () => void;
}

export const MaterialsCatalog: React.FC<MaterialsCatalogProps> = ({
  materials,
  profile,
  universities,
  partnerAds,
  selectedMajorFilter,
  onChangeMajorFilter,
  selectedCourseFilter,
  onChangeCourseFilter,
  selectedUniversityFilter,
  onChangeUniversityFilter,
  selectedFacultyFilter,
  onChangeFacultyFilter,
  selectedDepartmentFilter,
  onChangeDepartmentFilter,
  onSelectMaterial,
  onOpenUpload,
  onGoToEvaluations,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('most_active_dept');
  const [quickStripMode, setQuickStripMode] = useState<'departments' | 'deanships'>('departments');
  const [typeFilter, setTypeFilter] = useState<'all' | MaterialType>('all');
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});
  const [directoryExpanded, setDirectoryExpanded] = useState(true);
  const [directoryTab, setDirectoryTab] = useState<'all' | 'university' | 'college'>('all');
  const [directorySearch, setDirectorySearch] = useState('');

  const universityFilter = selectedUniversityFilter;
  const setUniversityFilter = onChangeUniversityFilter;
  const facultyFilter = selectedFacultyFilter;
  const setFacultyFilter = onChangeFacultyFilter;
  const courseFilter = selectedCourseFilter;
  const setCourseFilter = onChangeCourseFilter;
  const departmentFilter = selectedDepartmentFilter;
  const setDepartmentFilter = onChangeDepartmentFilter;

  const mainUniversities = useMemo(
    () => GAZA_INSTITUTIONS.filter((i) => i.category === 'university'),
    [],
  );
  const collegeInstitutions = useMemo(
    () => GAZA_INSTITUTIONS.filter((i) => i.category === 'college'),
    [],
  );

  // Compute department upload activity counts across Gaza institutions
  const departmentActivityRanking = useMemo(() => {
    const map = new Map<
      string,
      {
        department: string;
        university: string;
        faculty: string;
        count: number;
        downloadsCount: number;
      }
    >();

    for (const item of materials) {
      if (universityFilter !== 'all' && item.university !== universityFilter) continue;
      if (facultyFilter !== 'all' && item.faculty !== facultyFilter) continue;
      const dept = item.department?.trim() || MAJOR_LABELS[item.majorId];
      const existing = map.get(dept);
      if (existing) {
        existing.count += 1;
        existing.downloadsCount += item.downloadsCount || 0;
      } else {
        map.set(dept, {
          department: dept,
          university: item.university,
          faculty: item.faculty || '',
          count: 1,
          downloadsCount: item.downloadsCount || 0,
        });
      }
    }

    return Array.from(map.values()).sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return b.downloadsCount - a.downloadsCount;
    });
  }, [materials, universityFilter, facultyFilter]);

  const departmentUploadCountMap = useMemo(() => {
    const counts = new Map<string, number>();
    for (const m of materials) {
      const dept = m.department?.trim() || MAJOR_LABELS[m.majorId];
      counts.set(dept, (counts.get(dept) || 0) + 1);
    }
    return counts;
  }, [materials]);

  const universityUploadCountMap = useMemo(() => {
    const counts = new Map<string, number>();
    for (const m of materials) {
      counts.set(m.university, (counts.get(m.university) || 0) + 1);
    }
    return counts;
  }, [materials]);

  const facultyUploadCountMap = useMemo(() => {
    const counts = new Map<string, number>();
    for (const m of materials) {
      if (m.faculty?.trim()) {
        counts.set(m.faculty.trim(), (counts.get(m.faculty.trim()) || 0) + 1);
      }
    }
    return counts;
  }, [materials]);

  const facultyActivityRanking = useMemo(() => {
    const map = new Map<
      string,
      { faculty: string; university: string; count: number; downloadsCount: number }
    >();
    for (const item of materials) {
      if (universityFilter !== 'all' && item.university !== universityFilter) continue;
      const fac = item.faculty?.trim();
      if (!fac) continue;
      const existing = map.get(fac);
      if (existing) {
        existing.count += 1;
        existing.downloadsCount += item.downloadsCount || 0;
      } else {
        map.set(fac, {
          faculty: fac,
          university: item.university,
          count: 1,
          downloadsCount: item.downloadsCount || 0,
        });
      }
    }
    return Array.from(map.values()).sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return b.downloadsCount - a.downloadsCount;
    });
  }, [materials, universityFilter]);

  const availableFaculties = useMemo(() => {
    if (universityFilter !== 'all') {
      return getDeanshipsForInstitution(universityFilter).map((d) => d.name);
    }
    const set = new Set<string>();
    for (const m of materials) {
      if (m.faculty) set.add(m.faculty);
    }
    return Array.from(set);
  }, [materials, universityFilter]);

  const availableDepartments = useMemo(() => {
    if (universityFilter !== 'all' && facultyFilter !== 'all') {
      const depts = getDepartmentsForDeanship(universityFilter, facultyFilter);
      return [...depts].sort(
        (a, b) => (departmentUploadCountMap.get(b) || 0) - (departmentUploadCountMap.get(a) || 0),
      );
    }
    if (universityFilter !== 'all') {
      const deanships = getDeanshipsForInstitution(universityFilter);
      const depts = deanships.flatMap((d) => d.departments);
      return [...depts].sort(
        (a, b) => (departmentUploadCountMap.get(b) || 0) - (departmentUploadCountMap.get(a) || 0),
      );
    }
    return departmentActivityRanking.map((d) => d.department);
  }, [universityFilter, facultyFilter, departmentActivityRanking, departmentUploadCountMap]);

  const availableCourses = useMemo(() => {
    const filtered = materials.filter((item) => {
      if (universityFilter !== 'all' && item.university !== universityFilter) return false;
      if (facultyFilter !== 'all' && item.faculty !== facultyFilter) return false;
      if (departmentFilter !== 'all' && item.department !== departmentFilter) return false;
      if (selectedMajorFilter === 'my_courses') {
        return item.majorId === profile.majorId;
      }
      if (selectedMajorFilter !== 'all' && item.majorId !== selectedMajorFilter) return false;
      return true;
    });
    const set = new Set(filtered.map((m) => m.courseName));
    return Array.from(set);
  }, [
    materials,
    universityFilter,
    facultyFilter,
    departmentFilter,
    selectedMajorFilter,
    profile.majorId,
  ]);

  const filteredMaterials = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return materials
      .filter((item) => {
        if (universityFilter !== 'all' && item.university !== universityFilter) return false;
        if (facultyFilter !== 'all' && item.faculty !== facultyFilter) return false;
        if (departmentFilter !== 'all') {
          const itemDept = item.department?.trim() || MAJOR_LABELS[item.majorId];
          if (itemDept !== departmentFilter) return false;
        }
        if (selectedMajorFilter === 'my_courses') {
          if (item.majorId !== profile.majorId) return false;
        } else if (selectedMajorFilter !== 'all' && item.majorId !== selectedMajorFilter) {
          return false;
        }
        if (courseFilter !== 'all' && item.courseName !== courseFilter) return false;
        if (typeFilter !== 'all' && item.type !== typeFilter) return false;

        if (q) {
          const haystack = `${item.title} ${item.courseName} ${item.courseCode} ${item.summaryNotes} ${item.authorName} ${item.university} ${item.faculty || ''} ${item.department || ''}`.toLowerCase();
          return haystack.includes(q);
        }
        return true;
      })
      .sort((a, b) => {
        if (sortMode === 'most_active_dept') {
          const aDept = a.department?.trim() || MAJOR_LABELS[a.majorId];
          const bDept = b.department?.trim() || MAJOR_LABELS[b.majorId];
          const aCount = departmentUploadCountMap.get(aDept) || 0;
          const bCount = departmentUploadCountMap.get(bDept) || 0;
          if (bCount !== aCount) return bCount - aCount;
          if (b.downloadsCount !== a.downloadsCount) return b.downloadsCount - a.downloadsCount;
          return b.updatedAt.localeCompare(a.updatedAt);
        }
        if (sortMode === 'newest') {
          return b.updatedAt.localeCompare(a.updatedAt);
        }
        // 'recommended': Prioritize student's own university + department + major + year at top
        const aMatch =
          (a.university === profile.university ? 2 : 0) +
          (a.department && a.department === profile.department ? 3 : 0) +
          (a.majorId === profile.majorId ? 2 : 0) +
          (a.academicYear === profile.academicYear ? 1 : 0);
        const bMatch =
          (b.university === profile.university ? 2 : 0) +
          (b.department && b.department === profile.department ? 3 : 0) +
          (b.majorId === profile.majorId ? 2 : 0) +
          (b.academicYear === profile.academicYear ? 1 : 0);
        return bMatch - aMatch;
      });
  }, [
    materials,
    universityFilter,
    facultyFilter,
    departmentFilter,
    selectedMajorFilter,
    courseFilter,
    typeFilter,
    searchQuery,
    sortMode,
    departmentUploadCountMap,
    profile.university,
    profile.department,
    profile.majorId,
    profile.academicYear,
  ]);

  const resetFilters = () => {
    setSearchQuery('');
    setUniversityFilter('all');
    setFacultyFilter('all');
    setDepartmentFilter('all');
    setCourseFilter('all');
    setTypeFilter('all');
    onChangeMajorFilter('all');
  };

  const majorDepartmentCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const item of getAllGazaDepartments()) {
      const mId = inferMajorFromGaza(item.faculty, item.department);
      counts[mId] = (counts[mId] || 0) + 1;
    }
    return counts;
  }, []);

  const majorCards: { id: MajorId; count: number; deptsCount: number }[] = ALL_MAJOR_IDS.map((id) => ({
    id,
    count: materials.filter((m) => m.majorId === id).length,
    deptsCount: majorDepartmentCounts[id] || 0,
  }));

  const studentUploads = useMemo(
    () => materials.filter((m) => m.authorRole === 'student'),
    [materials],
  );

  const directoryInstitutions = useMemo(() => {
    const q = directorySearch.trim().toLowerCase();
    return GAZA_INSTITUTIONS.filter((i) => directoryTab === 'all' || i.category === directoryTab)
      .map((inst) => {
        if (!q) return inst;
        const instMatch = inst.name.toLowerCase().includes(q);
        if (instMatch) return inst;
        const matchingDeanships = inst.deanships
          .map((dean) => {
            if (dean.name.toLowerCase().includes(q)) return dean;
            const matchingDepts = dean.departments.filter((d) => d.toLowerCase().includes(q));
            if (matchingDepts.length === 0) return null;
            return { ...dean, departments: matchingDepts };
          })
          .filter((d): d is NonNullable<typeof d> => d !== null);
        if (matchingDeanships.length === 0) return null;
        return { ...inst, deanships: matchingDeanships };
      })
      .filter((inst): inst is NonNullable<typeof inst> => inst !== null);
  }, [directoryTab, directorySearch]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      {/* Visual Student Uploaded Summaries Status Tracker */}
      {studentUploads.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-lg sm:text-xl font-bold text-[#0F172A]">
                حالة ملخصاتك المرفوعة وتقييم معلم المادة
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                متابعة مباشرة لحالة ملفاتك: قيد المراجعة، تم القبول مع النقاط الممنوحة، أو ملاحظات التعديل
              </p>
            </div>
            {onGoToEvaluations && (
              <button
                type="button"
                onClick={onGoToEvaluations}
                className="text-xs font-semibold text-[#2563EB] hover:underline underline-offset-4 self-start sm:self-auto"
              >
                عرض سجل التقييمات والنقاط الكامل
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {studentUploads.slice(0, 6).map((sub) => {
              const status = sub.evaluationStatus || 'pending';
              const isApproved = status === 'evaluated';
              const isRevision = status === 'needs_revision';

              return (
                <button
                  key={sub.id}
                  type="button"
                  onClick={() => onSelectMaterial(sub)}
                  className={`text-right p-4 rounded-xl border transition-colors flex flex-col justify-between gap-2.5 ${
                    isApproved
                      ? 'bg-emerald-50/50 border-emerald-200 hover:border-emerald-300'
                      : isRevision
                        ? 'bg-red-50/50 border-red-200 hover:border-red-300'
                        : 'bg-[#FFFBEB]/60 border-[#FDE68A] hover:border-amber-300'
                  }`}
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="font-mono-nums font-semibold text-slate-700">
                        {sub.courseCode}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 font-bold ${
                          isApproved
                            ? 'text-[#059669]'
                            : isRevision
                              ? 'text-red-700'
                              : 'text-[#B45309]'
                        }`}
                      >
                        {isApproved ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span className="font-mono-nums">
                              تم القبول (+{sub.teacherPointsAwarded || 0} نقطة)
                            </span>
                          </>
                        ) : isRevision ? (
                          <>
                            <AlertCircle className="w-3.5 h-3.5" />
                            <span>ملاحظات تعديل</span>
                          </>
                        ) : (
                          <>
                            <Clock className="w-3.5 h-3.5" />
                            <span>قيد المراجعة</span>
                          </>
                        )}
                      </span>
                    </div>

                    <div className="font-display text-sm font-bold text-[#0F172A] line-clamp-1">
                      {sub.title}
                    </div>

                    {sub.fileName && (
                      <div className="inline-flex items-center gap-1 text-[11px] font-mono-nums text-slate-600">
                        <FileText className="w-3 h-3 text-[#2563EB] shrink-0" />
                        <span className="truncate">{sub.fileName}</span>
                      </div>
                    )}
                  </div>

                  {sub.teacherEvaluationNote ? (
                    <p className="text-xs text-slate-700 bg-white/80 border border-slate-200/80 rounded-lg px-2.5 py-1.5 line-clamp-2">
                      {sub.teacherEvaluationNote}
                    </p>
                  ) : (
                    <p className="text-[11px] text-slate-500">
                      بانتظار مراجعة معلم المادة واحتساب النقاط
                    </p>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* All 12 Academic Specializations Showcase */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 mb-5">
          <div>
            <h2 className="font-display text-2xl font-bold text-[#0F172A]">
              التخصصات الجامعية المتوفرة (12 مساراً · 350 تخصصاً وقسماً)
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              اختر تخصصك للوصول الفوري إلى المحاضرات والملخصات وأسئلة السنوات السابقة في جامعات وكليات قطاع غزة
            </p>
          </div>
          <span className="text-xs text-slate-500">
            طب · صيدلة · هندسة · IT · إدارة · قانون · تربية · إعلام · علوم · فنون · إنسانية · رياضة
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {majorCards.map((mc) => {
            const isSelected = selectedMajorFilter === mc.id;
            const imgBroken = failedImages[mc.id];
            return (
              <button
                key={mc.id}
                type="button"
                onClick={() => {
                  onChangeMajorFilter(isSelected ? 'all' : mc.id);
                  setCourseFilter('all');
                }}
                className={`group text-right bg-white rounded-xl overflow-hidden border transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] ${
                  isSelected
                    ? 'border-[#2563EB] ring-1 ring-[#2563EB]'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="h-24 bg-slate-100 overflow-hidden">
                  {!imgBroken ? (
                    <img
                      src={MAJOR_COVER_IMAGES[mc.id]}
                      alt={`مواد تخصص ${MAJOR_LABELS[mc.id]}`}
                      referrerPolicy="no-referrer"
                      onError={() => setFailedImages((prev) => ({ ...prev, [mc.id]: true }))}
                      className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-200"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-slate-100 text-slate-400">
                      <BookOpen className="w-8 h-8" />
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-display text-sm sm:text-base font-bold text-[#0F172A] leading-snug">
                      {MAJOR_LABELS[mc.id]}
                    </h3>
                    <span className="font-mono-nums text-xs font-semibold text-[#2563EB] whitespace-nowrap shrink-0">
                      {mc.count} ملف
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1.5 line-clamp-2 leading-relaxed">
                    {MAJOR_DESCRIPTIONS[mc.id]}
                  </p>
                  <div className="mt-2 pt-2 border-t border-slate-100 text-[11px] font-mono-nums text-slate-500">
                    {mc.deptsCount} قسماً وتخصصاً في جامعات غزة
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Hierarchical Gaza Search, Cascading Filters & Most Active Departments Toolbar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 space-y-5">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث باسم المساق، رمز المادة، اسم القسم أو الجامعة في غزة..."
              className="w-full h-11 pr-10 pl-4 text-sm bg-[#F8FAFC] border border-slate-200 rounded-lg text-[#0F172A] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:bg-white"
            />
          </div>

          <div className="flex items-center gap-2 lg:w-[320px]">
            <SlidersHorizontal className="w-4 h-4 text-slate-500 shrink-0" />
            <select
              aria-label="ترتيب المواد والأقسام"
              value={sortMode}
              onChange={(e) => setSortMode(e.target.value as SortMode)}
              className="w-full h-11 px-3 text-sm font-medium bg-[#F8FAFC] border border-slate-200 rounded-lg text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
            >
              <option value="most_active_dept">الأقسام الأكثر نشاطاً في رفع الملفات</option>
              <option value="recommended">الأنسب لملفي الجامعي</option>
              <option value="newest">الأحدث رفعاً وتحديثاً</option>
            </select>
          </div>
        </div>

        {/* Cascading Gaza Institution -> Deanship -> Department -> Course Selects */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <select
            aria-label="تصفية حسب الجامعة أو الكلية في غزة"
            value={universityFilter}
            onChange={(e) => {
              setUniversityFilter(e.target.value);
              setFacultyFilter('all');
              setDepartmentFilter('all');
              setCourseFilter('all');
            }}
            className="h-11 px-3 text-sm bg-[#F8FAFC] border border-slate-200 rounded-lg text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
          >
            <option value="all">كل جامعات وكليات قطاع غزة (14)</option>
            <optgroup label="أولاً: الجامعات الرئيسية الحكومية والخاصة">
              {mainUniversities.map((inst) => (
                <option key={inst.id} value={inst.name}>
                  {inst.name} ({universityUploadCountMap.get(inst.name) || 0})
                </option>
              ))}
            </optgroup>
            <optgroup label="ثانياً: الكليات الجامعية والمتوسطة">
              {collegeInstitutions.map((inst) => (
                <option key={inst.id} value={inst.name}>
                  {inst.name} ({universityUploadCountMap.get(inst.name) || 0})
                </option>
              ))}
            </optgroup>
            {universities
              .filter((u) => !GAZA_INSTITUTIONS.some((g) => g.name === u))
              .map((uni) => (
                <option key={uni} value={uni}>
                  {uni}
                </option>
              ))}
          </select>

          <select
            aria-label="تصفية حسب العمادة أو الكلية"
            value={facultyFilter}
            onChange={(e) => {
              setFacultyFilter(e.target.value);
              setDepartmentFilter('all');
              setCourseFilter('all');
            }}
            className="h-11 px-3 text-sm bg-[#F8FAFC] border border-slate-200 rounded-lg text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
          >
            <option value="all">كل العمادات والكليات</option>
            {availableFaculties.map((fac) => (
              <option key={fac} value={fac}>
                {fac}
              </option>
            ))}
          </select>

          <select
            aria-label="تصفية حسب القسم أو التخصص (مرتبة بالأكثر نشاطاً)"
            value={departmentFilter}
            onChange={(e) => {
              setDepartmentFilter(e.target.value);
              setCourseFilter('all');
            }}
            className="h-11 px-3 text-sm bg-[#F8FAFC] border border-slate-200 rounded-lg text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
          >
            <option value="all">كل الأقسام (الأكثر نشاطاً أولاً)</option>
            {availableDepartments.map((dept) => {
              const cnt = departmentUploadCountMap.get(dept) || 0;
              return (
                <option key={dept} value={dept}>
                  {dept} ({cnt})
                </option>
              );
            })}
          </select>

          <select
            aria-label="تصفية حسب المساق"
            value={courseFilter}
            onChange={(e) => setCourseFilter(e.target.value)}
            className="h-11 px-3 text-sm bg-[#F8FAFC] border border-slate-200 rounded-lg text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
          >
            <option value="all">كل المساقات</option>
            {availableCourses.map((course) => (
              <option key={course} value={course}>
                {course}
              </option>
            ))}
          </select>
        </div>

        {/* Most Active Departments & Deanships Quick Filter Strip */}
        {(departmentActivityRanking.length > 0 || facultyActivityRanking.length > 0) && (
          <div className="pt-3 border-t border-slate-100 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0F172A]">
                  <Flame className="w-4 h-4 text-[#D97706]" />
                  <span>تصفية سريعة حسب الأكثر نشاطاً:</span>
                </div>
                <div className="inline-flex items-center gap-1 p-0.5 bg-slate-100 rounded-md text-xs">
                  <button
                    type="button"
                    onClick={() => setQuickStripMode('departments')}
                    className={`px-2.5 py-1 rounded font-semibold transition-colors ${
                      quickStripMode === 'departments'
                        ? 'bg-white text-[#0F172A] shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    الأقسام
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickStripMode('deanships')}
                    className={`px-2.5 py-1 rounded font-semibold transition-colors ${
                      quickStripMode === 'deanships'
                        ? 'bg-white text-[#0F172A] shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    العمادات (70)
                  </button>
                </div>
              </div>
              {(departmentFilter !== 'all' || facultyFilter !== 'all') && (
                <button
                  type="button"
                  onClick={() => {
                    setFacultyFilter('all');
                    setDepartmentFilter('all');
                  }}
                  className="text-xs font-semibold text-[#2563EB] hover:underline underline-offset-4"
                >
                  عرض جميع العمادات والأقسام
                </button>
              )}
            </div>

            {quickStripMode === 'departments' ? (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setDepartmentFilter('all');
                    setSortMode('most_active_dept');
                  }}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors whitespace-nowrap shrink-0 ${
                    departmentFilter === 'all' && sortMode === 'most_active_dept'
                      ? 'bg-[#0F172A] text-white border-[#0F172A]'
                      : 'bg-[#F8FAFC] text-slate-700 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  الأكثر نشاطاً (الكل)
                </button>

                {departmentActivityRanking.slice(0, 8).map((entry, idx) => {
                  const isActive = departmentFilter === entry.department;
                  return (
                    <button
                      key={entry.department}
                      type="button"
                      onClick={() => {
                        setDepartmentFilter(isActive ? 'all' : entry.department);
                        setSortMode('most_active_dept');
                        setCourseFilter('all');
                      }}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors whitespace-nowrap shrink-0 ${
                        isActive
                          ? 'bg-[#2563EB] text-white border-[#2563EB]'
                          : idx === 0
                            ? 'bg-[#FFFBEB] text-[#92400E] border-[#FDE68A] hover:border-[#D97706]'
                            : 'bg-[#F8FAFC] text-slate-700 border-slate-200 hover:border-[#2563EB] hover:text-[#2563EB]'
                      }`}
                    >
                      <span>{entry.department}</span>
                      <span className="font-mono-nums opacity-85">({entry.count})</span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setFacultyFilter('all');
                    setDepartmentFilter('all');
                  }}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors whitespace-nowrap shrink-0 ${
                    facultyFilter === 'all'
                      ? 'bg-[#0F172A] text-white border-[#0F172A]'
                      : 'bg-[#F8FAFC] text-slate-700 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  كل العمادات
                </button>

                {facultyActivityRanking.slice(0, 8).map((entry, idx) => {
                  const isActive = facultyFilter === entry.faculty;
                  return (
                    <button
                      key={entry.faculty}
                      type="button"
                      onClick={() => {
                        setFacultyFilter(isActive ? 'all' : entry.faculty);
                        setDepartmentFilter('all');
                        setCourseFilter('all');
                      }}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors whitespace-nowrap shrink-0 ${
                        isActive
                          ? 'bg-[#2563EB] text-white border-[#2563EB]'
                          : idx === 0
                            ? 'bg-[#FFFBEB] text-[#92400E] border-[#FDE68A] hover:border-[#D97706]'
                            : 'bg-[#F8FAFC] text-slate-700 border-slate-200 hover:border-[#2563EB] hover:text-[#2563EB]'
                      }`}
                    >
                      <span>{entry.faculty}</span>
                      <span className="font-mono-nums opacity-85">({entry.count})</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Interactive Major & File-Type Filter Tabs */}
        <div className="flex flex-col gap-3 pt-3 border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg">
            {[
              { id: 'all', label: 'الكل' },
              { id: 'my_courses', label: `تخصصي (${MAJOR_LABELS[profile.majorId]})` },
              ...ALL_MAJOR_IDS.map((mId) => ({ id: mId, label: MAJOR_LABELS[mId] })),
            ].map((tab) => {
              const active = selectedMajorFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    onChangeMajorFilter(tab.id as 'all' | 'my_courses' | MajorId);
                    setCourseFilter('all');
                  }}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                    active
                      ? 'bg-white text-[#0F172A] shadow-sm font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg">
            <button
              type="button"
              onClick={() => setTypeFilter('all')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                typeFilter === 'all'
                  ? 'bg-white text-[#0F172A] shadow-sm font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              كل الأنواع
            </button>
            {(Object.keys(MATERIAL_TYPE_LABELS) as MaterialType[]).map((tKey) => {
              const active = typeFilter === tKey;
              return (
                <button
                  key={tKey}
                  type="button"
                  onClick={() => setTypeFilter(tKey)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                    active
                      ? 'bg-white text-[#0F172A] shadow-sm font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {MATERIAL_TYPE_LABELS[tKey]}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Results Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
          <span>
            عرض <strong className="font-mono-nums text-[#0F172A]">{filteredMaterials.length}</strong> مادة دراسية
          </span>
          {(universityFilter !== 'all' || facultyFilter !== 'all' || departmentFilter !== 'all') && (
            <button
              type="button"
              onClick={resetFilters}
              className="text-xs font-semibold text-[#2563EB] hover:underline underline-offset-4"
            >
              إلغاء جميع الفلاتر
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={onOpenUpload}
          className="text-sm font-semibold text-[#2563EB] hover:underline underline-offset-4"
        >
          هل لديك ملخص أفضل؟ ارفعه لتقييم معلم المادة وكسب النقاط
        </button>
      </div>

      {/* Materials Grid — Clean Zero-Pill Metadata & Single-Level Elevation */}
      {filteredMaterials.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center space-y-3">
          <p className="font-display text-lg font-bold text-[#0F172A]">
            لا توجد مواد تطابق خيارات البحث الحالية
          </p>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            يمكنك إعادة ضبط الفلاتر، أو إضافة اسم المساق في استبيان «شو المساقات اللي بدك موادها؟» ليتم توفيره.
          </p>
          <button
            type="button"
            onClick={resetFilters}
            className="inline-flex items-center justify-center px-4 py-2 text-sm font-semibold text-white bg-[#2563EB] hover:bg-[#1D4ED8] rounded-lg transition-colors"
          >
            إعادة ضبط البحث
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredMaterials.map((item) => {
            const hasAccess = canAccessMaterial(profile.planId, item.accessTier);
            const deptName = item.department?.trim() || MAJOR_LABELS[item.majorId];
            const deptCount = departmentUploadCountMap.get(deptName) || 1;
            return (
              <article
                key={item.id}
                className="bg-white border border-slate-200 hover:border-[#2563EB]/50 rounded-xl p-5 flex flex-col justify-between transition-colors"
              >
                <div className="space-y-3">
                  {/* Unboxed clean metadata line (Zero-Pill) */}
                  <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                    <span className="font-semibold text-[#2563EB]">{MAJOR_LABELS[item.majorId]}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono-nums">{item.courseCode}</span>
                    <span aria-hidden="true">·</span>
                    <span>{MATERIAL_TYPE_LABELS[item.type]}</span>
                    <span aria-hidden="true">·</span>
                    <span>{item.pagesOrDuration}</span>
                  </div>

                  {/* Clean Gaza Institution / Faculty / Department hierarchy */}
                  <div className="text-[11px] text-slate-500 leading-relaxed">
                    <strong className="text-slate-700">{item.university}</strong>
                    {item.faculty ? ` · ${item.faculty}` : ''}
                    {item.department ? (
                      <>
                        {' · '}
                        <span className="font-semibold text-[#0F172A]">{item.department}</span>
                        {deptCount >= 2 && (
                          <span className="font-mono-nums text-[#059669] mr-1">
                            ({deptCount} ملفات)
                          </span>
                        )}
                      </>
                    ) : null}
                  </div>

                  <h3 className="font-display text-lg font-bold text-[#0F172A] leading-snug">
                    <button
                      type="button"
                      onClick={() => onSelectMaterial(item)}
                      className="text-right hover:text-[#2563EB] transition-colors focus-visible:outline-none focus-visible:underline"
                    >
                      {item.title}
                    </button>
                  </h3>

                  <p className="text-sm text-slate-600 leading-relaxed line-clamp-2">
                    {item.summaryNotes}
                  </p>

                  {item.authorRole === 'student' && (
                    <div
                      className={`p-2.5 rounded-lg border text-xs space-y-1 ${
                        item.evaluationStatus === 'evaluated'
                          ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                          : item.evaluationStatus === 'needs_revision'
                            ? 'bg-red-50/70 border-red-200 text-red-900'
                            : 'bg-[#FFFBEB] border-[#FDE68A] text-[#92400E]'
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-1.5 font-semibold">
                        <span className="inline-flex items-center gap-1.5">
                          {item.evaluationStatus === 'evaluated' ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5 text-[#059669] shrink-0" />
                              <span>
                                تم القبول (
                                <span className="font-mono-nums">
                                  +{item.teacherPointsAwarded || 0} نقطة
                                </span>
                                )
                              </span>
                            </>
                          ) : item.evaluationStatus === 'needs_revision' ? (
                            <>
                              <AlertCircle className="w-3.5 h-3.5 text-red-600 shrink-0" />
                              <span>ملاحظات التعديل من المعلم</span>
                            </>
                          ) : (
                            <>
                              <Clock className="w-3.5 h-3.5 text-[#D97706] shrink-0" />
                              <span>قيد المراجعة لدى معلم المادة</span>
                            </>
                          )}
                        </span>
                      </div>
                      {item.teacherEvaluationNote && (
                        <p className="text-[11px] opacity-90 line-clamp-2">
                          {item.teacherEvaluationNote}
                        </p>
                      )}
                      {item.fileName && (
                        <div className="text-[11px] font-mono-nums text-slate-600 truncate">
                          الملف: {item.fileName}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="mt-5 pt-4 border-t border-slate-100 space-y-3">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span className="truncate max-w-[60%]">
                      {item.authorName} {item.verified ? '· موثق' : ''}
                    </span>
                    <span className="inline-flex items-center gap-1 font-mono-nums font-semibold text-[#0F172A]">
                      <Star className="w-3.5 h-3.5 fill-[#D97706] text-[#D97706]" />
                      {item.ratingAvg > 0 ? item.ratingAvg.toFixed(1) : '—'}
                      <span className="text-slate-400 font-normal">({item.ratingCount})</span>
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <span
                      className={`inline-flex items-center gap-1.5 text-xs font-semibold ${
                        hasAccess ? 'text-[#059669]' : 'text-[#D97706]'
                      }`}
                    >
                      {hasAccess ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>{item.accessTier === 'free' ? 'مجاني بالكامل' : 'مفتوح ضمن اشتراكك'}</span>
                        </>
                      ) : (
                        <>
                          <Lock className="w-3.5 h-3.5" />
                          <span>يتطلب {ACCESS_TIER_LABELS[item.accessTier]}</span>
                        </>
                      )}
                    </span>

                    <button
                      type="button"
                      onClick={() => onSelectMaterial(item)}
                      className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                        hasAccess
                          ? 'bg-slate-900 hover:bg-slate-800 text-white'
                          : 'bg-[#2563EB]/10 hover:bg-[#2563EB]/20 text-[#2563EB]'
                      }`}
                    >
                      {hasAccess ? 'معاينة وتقييم' : 'معاينة محدودة'}
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Comprehensive Gaza Strip Universities & Colleges Directory (14 Institutions x 5 Deanships x 5 Departments) */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <button
          type="button"
          onClick={() => setDirectoryExpanded((prev) => !prev)}
          className="w-full p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-right hover:bg-slate-50/70 transition-colors"
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-[#2563EB] shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display text-lg font-bold text-[#0F172A]">
                دليل جامعات وكليات قطاع غزة والعمادات والأقسام المعتمدة
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                8 جامعات رئيسية حكومية وخاصة + 6 كليات جامعية ومتوسطة · 5 عمادات و5 أقسام لكل مؤسسة (350 قسماً وتخصصاً)
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#2563EB] whitespace-nowrap shrink-0">
            <span>{directoryExpanded ? 'إخفاء الدليل الكامل' : 'استعراض كل الجامعات والأقسام'}</span>
            {directoryExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </span>
        </button>

        {directoryExpanded && (
          <div className="p-5 sm:p-6 pt-0 border-t border-slate-100 space-y-5">
            <div className="pt-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div className="inline-flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg self-start">
                <button
                  type="button"
                  onClick={() => setDirectoryTab('all')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
                    directoryTab === 'all'
                      ? 'bg-white text-[#0F172A] shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  جميع المؤسسات (14)
                </button>
                <button
                  type="button"
                  onClick={() => setDirectoryTab('university')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
                    directoryTab === 'university'
                      ? 'bg-white text-[#0F172A] shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  أولاً: الجامعات الرئيسية (8)
                </button>
                <button
                  type="button"
                  onClick={() => setDirectoryTab('college')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
                    directoryTab === 'college'
                      ? 'bg-white text-[#0F172A] shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  ثانياً: الكليات الجامعية والمتوسطة (6)
                </button>
              </div>

              <div className="relative w-full lg:w-80">
                <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={directorySearch}
                  onChange={(e) => setDirectorySearch(e.target.value)}
                  placeholder="ابحث عن أي تخصص أو عمادة من الـ 350..."
                  className="w-full h-10 pr-9 pl-3 text-xs bg-[#F8FAFC] border border-slate-200 rounded-lg text-[#0F172A] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:bg-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {directoryInstitutions.map((inst, instIdx) => {
                const uniCount = universityUploadCountMap.get(inst.name) || 0;
                return (
                  <div
                    key={inst.id}
                    className="p-4 sm:p-5 bg-[#F8FAFC] border border-slate-200 rounded-xl space-y-3"
                  >
                    <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-200">
                      <button
                        type="button"
                        onClick={() => {
                          setUniversityFilter(inst.name);
                          setFacultyFilter('all');
                          setDepartmentFilter('all');
                          setCourseFilter('all');
                        }}
                        className="text-right font-display text-base font-bold text-[#0F172A] hover:text-[#2563EB] transition-colors"
                      >
                        <span className="font-mono-nums text-xs text-slate-400 ml-1.5">
                          0{instIdx + 1}.
                        </span>
                        {inst.name}
                      </button>
                      <span className="font-mono-nums text-xs font-semibold text-[#2563EB] whitespace-nowrap shrink-0">
                        {uniCount} ملفات
                      </span>
                    </div>

                    <div className="space-y-2.5">
                      {inst.deanships.map((dean) => {
                        const facCount = facultyUploadCountMap.get(dean.name) || 0;
                        const isFacSelected =
                          universityFilter === inst.name && facultyFilter === dean.name;
                        return (
                          <div key={dean.id} className="space-y-1">
                            <button
                              type="button"
                              onClick={() => {
                                setUniversityFilter(inst.name);
                                setFacultyFilter(isFacSelected ? 'all' : dean.name);
                                setDepartmentFilter('all');
                                setCourseFilter('all');
                              }}
                              className={`text-right text-xs font-bold transition-colors hover:text-[#2563EB] hover:underline underline-offset-2 ${
                                isFacSelected ? 'text-[#2563EB]' : 'text-slate-700'
                              }`}
                            >
                              {dean.name}
                              {facCount > 0 ? (
                                <span className="font-mono-nums text-[#059669] mr-1">
                                  ({facCount})
                                </span>
                              ) : null}
                            </button>
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-slate-600">
                            {dean.departments.map((dept, dIdx) => {
                              const deptCount = departmentUploadCountMap.get(dept) || 0;
                              return (
                                <React.Fragment key={dept}>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setUniversityFilter(inst.name);
                                      setFacultyFilter(dean.name);
                                      setDepartmentFilter(dept);
                                      setCourseFilter('all');
                                    }}
                                    className="hover:text-[#2563EB] hover:underline underline-offset-2 text-right"
                                  >
                                    {dept}
                                    {deptCount > 0 ? (
                                      <span className="font-mono-nums text-[#059669] font-semibold mr-0.5">
                                        ({deptCount})
                                      </span>
                                    ) : null}
                                  </button>
                                  {dIdx < dean.departments.length - 1 && (
                                    <span aria-hidden="true" className="text-slate-300">
                                      ·
                                    </span>
                                  )}
                                </React.Fragment>
                              );
                            })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Campus Partners & Local Print/Library Ads Strip */}
      <div className="pt-4 border-t border-slate-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h2 className="font-display text-lg font-bold text-[#0F172A]">
              شركاء الحرم الجامعي وعروض المكتبات والمطابع
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              إعلانات وعروض مخصصة لطلبة المنصة من مكتبات ومطابع ومراكز تدريب داخل الجامعة
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {partnerAds.map((ad) => (
            <div
              key={ad.id}
              className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col justify-between gap-3"
            >
              <div>
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>{ad.category}</span>
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {ad.location}
                  </span>
                </div>
                <h3 className="font-display text-base font-bold text-[#0F172A] mt-1.5">
                  {ad.name}
                </h3>
                <p className="text-sm text-slate-600 mt-1">{ad.offer}</p>
              </div>
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500 inline-flex items-center gap-1">
                  <Tag className="w-3.5 h-3.5 text-[#2563EB]" />
                  كود الخصم:
                </span>
                <span className="font-mono-nums font-semibold text-[#0F172A]">{ad.code}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
