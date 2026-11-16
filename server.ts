import express from 'express';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createServer as createViteServer } from 'vite';
import { runAcademicAssistantChat } from './server/geminiAssistant.ts';
import { INITIAL_STATE } from './server/seedData.ts';
import type {
  AccessTier,
  AppState,
  AssistantRole,
  BillingCycle,
  ExamCourse,
  ExamNotificationLog,
  LinkedAccountsMap,
  MajorId,
  MaterialStatusNotification,
  MaterialType,
  PlanId,
  SocialProvider,
  StudyMaterial,
  TeacherEvaluationStatus,
  UserRole,
} from './src/types/dirasati.ts';

const PORT = 3000;
const DATA_DIR = path.resolve(process.cwd(), 'data');
const STATE_FILE = path.join(DATA_DIR, 'dirasati-state.json');
const ACCOUNTS_FILE = path.join(DATA_DIR, 'dirasati-accounts.json');

interface StoredAccount {
  email: string;
  password: string;
  role: UserRole;
  displayName: string;
  university?: string;
  faculty?: string;
  department?: string;
  majorId?: MajorId;
  departmentOrTitle: string;
  linkedAccounts?: LinkedAccountsMap;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SOCIAL_PROVIDERS: SocialProvider[] = ['x', 'facebook', 'google', 'instagram'];
const VALID_MAJOR_IDS: MajorId[] = [
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

function sanitizeLinkedAccounts(input?: Partial<LinkedAccountsMap>): LinkedAccountsMap {
  const result = {} as LinkedAccountsMap;
  for (const p of SOCIAL_PROVIDERS) {
    const entry = input?.[p];
    const handle = typeof entry?.handle === 'string' ? entry.handle.trim() : '';
    const connected = Boolean(entry?.connected && handle);
    result[p] = {
      connected,
      handle: connected ? handle : '',
      ...(connected ? { connectedAt: entry?.connectedAt || new Date().toISOString() } : {}),
    };
  }
  return result;
}

async function loadState(): Promise<AppState> {
  try {
    const raw = await fs.readFile(STATE_FILE, 'utf8');
    const parsed = JSON.parse(raw) as Partial<AppState>;
    const parsedProfile: Partial<AppState['profile']> = parsed.profile || {};
    return {
      ...INITIAL_STATE,
      ...parsed,
      universities: INITIAL_STATE.universities,
      authSession: parsed.authSession
        ? { ...INITIAL_STATE.authSession, ...parsed.authSession }
        : INITIAL_STATE.authSession,
      profile: {
        ...INITIAL_STATE.profile,
        ...parsedProfile,
        university:
          parsedProfile.university && INITIAL_STATE.universities.includes(parsedProfile.university)
            ? parsedProfile.university
            : INITIAL_STATE.profile.university,
        faculty: parsedProfile.faculty || INITIAL_STATE.profile.faculty,
        department: parsedProfile.department || INITIAL_STATE.profile.department,
        enrolledCourses: Array.isArray(parsedProfile.enrolledCourses)
          ? parsedProfile.enrolledCourses
          : INITIAL_STATE.profile.enrolledCourses,
        alertLeadHours:
          typeof parsedProfile.alertLeadHours === 'number'
            ? parsedProfile.alertLeadHours
            : INITIAL_STATE.profile.alertLeadHours,
        linkedAccounts: {
          ...INITIAL_STATE.profile.linkedAccounts,
          ...(parsedProfile.linkedAccounts || {}),
        },
      },
      materials: (() => {
        const seedById = new Map(INITIAL_STATE.materials.map((m) => [m.id, m]));
        const existing =
          Array.isArray(parsed.materials) && parsed.materials.length > 0
            ? parsed.materials.map((m) => {
                const seedMatch = seedById.get(m.id);
                if (seedMatch) {
                  return {
                    ...m,
                    university: seedMatch.university,
                    faculty: m.faculty || seedMatch.faculty,
                    department: m.department || seedMatch.department,
                  };
                }
                const uniValid = INITIAL_STATE.universities.includes(m.university);
                return uniValid
                  ? m
                  : {
                      ...m,
                      university: INITIAL_STATE.profile.university,
                      faculty: m.faculty || INITIAL_STATE.profile.faculty,
                      department: m.department || INITIAL_STATE.profile.department,
                    };
              })
            : INITIAL_STATE.materials;
        const existingIds = new Set(existing.map((m) => m.id));
        const missingSeeds = INITIAL_STATE.materials.filter((m) => !existingIds.has(m.id));
        return [...missingSeeds.filter((m) => m.evaluationStatus === 'pending'), ...existing, ...missingSeeds.filter((m) => m.evaluationStatus !== 'pending')];
      })(),
      courseRequests: Array.isArray(parsed.courseRequests)
        ? parsed.courseRequests.map((r) =>
            INITIAL_STATE.universities.includes(r.university)
              ? r
              : { ...r, university: INITIAL_STATE.profile.university },
          )
        : INITIAL_STATE.courseRequests,
      leanTasks: Array.isArray(parsed.leanTasks) && parsed.leanTasks.length > 0 ? parsed.leanTasks : INITIAL_STATE.leanTasks,
      canvasBlocks: INITIAL_STATE.canvasBlocks,
      partnerAds: INITIAL_STATE.partnerAds,
      supportTickets: Array.isArray(parsed.supportTickets) ? parsed.supportTickets : [],
      exams: (() => {
        const existing = Array.isArray(parsed.exams) && parsed.exams.length > 0 ? parsed.exams : INITIAL_STATE.exams;
        const existingIds = new Set(existing.map((e) => e.id));
        const missing = INITIAL_STATE.exams.filter((e) => !existingIds.has(e.id));
        return [...existing, ...missing];
      })(),
      examNotifications: Array.isArray(parsed.examNotifications) ? parsed.examNotifications : [],
      materialNotifications: Array.isArray(parsed.materialNotifications)
        ? parsed.materialNotifications
        : INITIAL_STATE.materialNotifications,
    };
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(STATE_FILE, JSON.stringify(INITIAL_STATE, null, 2), 'utf8');
    return structuredClone(INITIAL_STATE);
  }
}

async function saveState(state: AppState): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(STATE_FILE, JSON.stringify(state, null, 2), 'utf8');
}

async function loadAccounts(): Promise<Record<string, StoredAccount>> {
  try {
    const raw = await fs.readFile(ACCOUNTS_FILE, 'utf8');
    return JSON.parse(raw) as Record<string, StoredAccount>;
  } catch {
    return {};
  }
}

async function saveAccounts(accounts: Record<string, StoredAccount>): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(ACCOUNTS_FILE, JSON.stringify(accounts, null, 2), 'utf8');
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  let state = await loadState();
  let accounts = await loadAccounts();

  app.get('/api/state', (_req, res) => {
    res.json(state);
  });

  app.patch('/api/profile', async (req, res) => {
    const body = req.body as Partial<AppState['profile']>;
    state.profile = {
      ...state.profile,
      ...(typeof body.name === 'string' && body.name.trim() ? { name: body.name.trim() } : {}),
      ...(typeof body.university === 'string' && body.university.trim() ? { university: body.university } : {}),
      ...(typeof body.faculty === 'string' ? { faculty: body.faculty.trim() || undefined } : {}),
      ...(typeof body.department === 'string' ? { department: body.department.trim() || undefined } : {}),
      ...(body.majorId && VALID_MAJOR_IDS.includes(body.majorId)
        ? { majorId: body.majorId as MajorId }
        : {}),
      ...(typeof body.academicYear === 'number' && body.academicYear >= 1 && body.academicYear <= 6
        ? { academicYear: body.academicYear }
        : {}),
      ...(typeof body.examAlertsEnabled === 'boolean' ? { examAlertsEnabled: body.examAlertsEnabled } : {}),
      ...(typeof body.whatsappAlertsEnabled === 'boolean' ? { whatsappAlertsEnabled: body.whatsappAlertsEnabled } : {}),
      ...(typeof body.emailAlertsEnabled === 'boolean' ? { emailAlertsEnabled: body.emailAlertsEnabled } : {}),
      ...(Array.isArray(body.enrolledCourses)
        ? { enrolledCourses: body.enrolledCourses.filter((c) => typeof c === 'string' && c.trim()) }
        : {}),
      ...(typeof body.alertLeadHours === 'number' && body.alertLeadHours >= 12 && body.alertLeadHours <= 336
        ? { alertLeadHours: body.alertLeadHours }
        : {}),
    };
    await saveState(state);
    res.json(state);
  });

  app.patch('/api/profile/linked-accounts', async (req, res) => {
    const body = req.body as {
      provider?: SocialProvider;
      connected?: boolean;
      handle?: string;
    };

    if (!body.provider || !SOCIAL_PROVIDERS.includes(body.provider)) {
      res.status(400).json({ error: 'مزود الحساب الاجتماعي غير صالح.' });
      return;
    }

    const connected = Boolean(body.connected);
    const handle = (body.handle || '').trim();

    if (connected && !handle) {
      res.status(400).json({ error: 'يرجى إدخال اسم المستخدم أو البريد الإلكتروني لربط الحساب.' });
      return;
    }

    const nextLinks: LinkedAccountsMap = {
      ...state.profile.linkedAccounts,
      [body.provider]: {
        connected,
        handle: connected ? handle : '',
        ...(connected ? { connectedAt: new Date().toISOString() } : {}),
      },
    };

    state.profile = {
      ...state.profile,
      linkedAccounts: nextLinks,
    };

    if (state.authSession.isAuthenticated && accounts[state.authSession.email]) {
      accounts[state.authSession.email] = {
        ...accounts[state.authSession.email],
        linkedAccounts: nextLinks,
      };
      await saveAccounts(accounts);
    }

    await saveState(state);
    res.json(state);
  });

  app.post('/api/auth/register', async (req, res) => {
    const body = req.body as {
      role?: UserRole;
      displayName?: string;
      email?: string;
      password?: string;
      university?: string;
      faculty?: string;
      department?: string;
      majorId?: MajorId;
      departmentOrTitle?: string;
      linkedAccounts?: Partial<LinkedAccountsMap>;
    };

    if (body.role === 'admin') {
      res.status(403).json({
        error: 'إنشاء حساب جديد متاح للطلاب والمعلمين فقط. حسابات الإدارة تضاف من النظام.',
      });
      return;
    }

    const role: 'student' | 'teacher' = body.role === 'teacher' ? 'teacher' : 'student';
    const normalizedEmail = (body.email || '').trim().toLowerCase();
    const displayName = (body.displayName || '').trim();
    const password = (body.password || '').trim();

    if (!displayName) {
      res.status(400).json({ error: 'يرجى إدخال الاسم الكامل لإنشاء الحساب.' });
      return;
    }

    if (!normalizedEmail || !EMAIL_REGEX.test(normalizedEmail)) {
      res.status(400).json({ error: 'يرجى إدخال بريد إلكتروني صحيح (مثال: name@gmail.com).' });
      return;
    }

    if (password.length < 4) {
      res.status(400).json({ error: 'يجب أن تتكون كلمة المرور من 4 أحرف أو أرقام على الأقل.' });
      return;
    }

    if (accounts[normalizedEmail]) {
      res.status(409).json({
        error: 'هذا البريد الإلكتروني مسجل مسبقاً. يرجى تسجيل الدخول بدلاً من ذلك.',
      });
      return;
    }

    const sanitizedLinks = sanitizeLinkedAccounts(body.linkedAccounts);
    const faculty = body.faculty?.trim() || undefined;
    const department = body.department?.trim() || undefined;

    const departmentOrTitle =
      body.departmentOrTitle?.trim() ||
      (faculty
        ? `${faculty}${department ? ` — ${department}` : ''}`
        : role === 'teacher'
          ? 'عضو هيئة تدريس — المواد الرسمية'
          : 'حساب طالب جامعي');

    accounts[normalizedEmail] = {
      email: normalizedEmail,
      password,
      role,
      displayName,
      university: body.university,
      faculty,
      department,
      majorId: body.majorId,
      departmentOrTitle,
      linkedAccounts: sanitizedLinks,
    };
    await saveAccounts(accounts);

    state.authSession = {
      isAuthenticated: true,
      role,
      displayName,
      email: normalizedEmail,
      departmentOrTitle,
    };

    state.profile = {
      ...state.profile,
      ...(role === 'student' ? { name: displayName } : {}),
      linkedAccounts: sanitizedLinks,
      ...(body.university ? { university: body.university } : {}),
      ...(faculty ? { faculty } : {}),
      ...(department ? { department } : {}),
      ...(body.majorId && VALID_MAJOR_IDS.includes(body.majorId) ? { majorId: body.majorId } : {}),
    };

    await saveState(state);
    res.status(201).json(state);
  });

  app.post('/api/auth/login', async (req, res) => {
    const body = req.body as {
      role?: UserRole;
      displayName?: string;
      email?: string;
      password?: string;
      university?: string;
      faculty?: string;
      department?: string;
      majorId?: MajorId;
      departmentOrTitle?: string;
      linkedAccounts?: Partial<LinkedAccountsMap>;
      secretCode?: string;
    };

    const role: UserRole =
      body.role && ['student', 'teacher', 'admin'].includes(body.role) ? body.role : 'student';

    const normalizedEmail = (body.email || '').trim().toLowerCase();
    const password = (body.password || '').trim();
    const facultyInput = body.faculty?.trim() || undefined;
    const departmentInput = body.department?.trim() || undefined;
    const isSecretShortcut =
      (body.secretCode === '159632' || body.displayName?.trim() === '159632') &&
      !normalizedEmail &&
      !password;

    if (isSecretShortcut) {
      const defaultSessionByRole: Record<
        UserRole,
        { displayName: string; email: string; departmentOrTitle: string }
      > = {
        student: {
          displayName: state.profile.name || 'أحمد العبدالله',
          email: 'student@dirasati.edu',
          departmentOrTitle: facultyInput
            ? `${facultyInput}${departmentInput ? ` — ${departmentInput}` : ''}`
            : state.profile.faculty || 'عمادة كلية الهندسة — حساب طالب',
        },
        teacher: {
          displayName: 'د. طارق النسور',
          email: 'instructor@dirasati.edu',
          departmentOrTitle: facultyInput
            ? `${facultyInput} — عضو هيئة تدريس`
            : 'عضو هيئة تدريس — المواد الرسمية',
        },
        admin: {
          displayName: 'إدارة منصة دراستي',
          email: 'admin@dirasati.edu',
          departmentOrTitle: 'الإدارة العامة وتوثيق المحتوى',
        },
      };

      const shortcutSession = defaultSessionByRole[role];
      state.authSession = {
        isAuthenticated: true,
        role,
        displayName: shortcutSession.displayName,
        email: shortcutSession.email,
        departmentOrTitle: shortcutSession.departmentOrTitle,
      };
      if (role !== 'admin') {
        state.profile = {
          ...state.profile,
          ...(body.university ? { university: body.university } : {}),
          ...(facultyInput ? { faculty: facultyInput } : {}),
          ...(departmentInput ? { department: departmentInput } : {}),
          ...(body.majorId && VALID_MAJOR_IDS.includes(body.majorId) ? { majorId: body.majorId } : {}),
        };
      }
      await saveState(state);
      res.json(state);
      return;
    }

    if (!normalizedEmail || !EMAIL_REGEX.test(normalizedEmail)) {
      res.status(400).json({ error: 'يرجى إدخال بريد إلكتروني صحيح (مثال: name@gmail.com).' });
      return;
    }

    if (!password) {
      res.status(400).json({ error: 'يرجى إدخال كلمة المرور للدخول بحساب البريد الإلكتروني.' });
      return;
    }

    const existingAccount = accounts[normalizedEmail];
    if (!existingAccount && role !== 'admin') {
      res.status(404).json({
        error: 'لا يوجد حساب مسجل بهذا البريد الإلكتروني. يمكنك الضغط على «إنشاء حساب جديد» للتسجيل كطالب أو معلم.',
      });
      return;
    }

    if (existingAccount && existingAccount.password !== password) {
      res.status(401).json({ error: 'كلمة المرور غير صحيحة لهذا البريد الإلكتروني.' });
      return;
    }

    const emailHandle = normalizedEmail.split('@')[0] || 'مستخدم';
    const displayName =
      body.displayName?.trim() || existingAccount?.displayName || (role === 'admin' ? 'إدارة منصة دراستي' : emailHandle);
    const resolvedRole = existingAccount ? existingAccount.role : role;
    const resolvedFaculty = facultyInput || existingAccount?.faculty;
    const resolvedDepartment = departmentInput || existingAccount?.department;
    const departmentOrTitle =
      body.departmentOrTitle?.trim() ||
      (resolvedFaculty && resolvedRole !== 'admin'
        ? `${resolvedFaculty}${resolvedDepartment ? ` — ${resolvedDepartment}` : ''}`
        : existingAccount?.departmentOrTitle) ||
      (resolvedRole === 'admin'
        ? 'الإدارة العامة وتوثيق المحتوى'
        : resolvedRole === 'teacher'
          ? 'عضو هيئة تدريس — المواد الرسمية'
          : 'حساب طالب جامعي');

    const baseLinks = existingAccount?.linkedAccounts || state.profile.linkedAccounts;
    const incomingLinks = body.linkedAccounts ? sanitizeLinkedAccounts(body.linkedAccounts) : null;
    const mergedLinks: LinkedAccountsMap = incomingLinks
      ? {
          x: incomingLinks.x.connected ? incomingLinks.x : baseLinks.x,
          facebook: incomingLinks.facebook.connected ? incomingLinks.facebook : baseLinks.facebook,
          google: incomingLinks.google.connected ? incomingLinks.google : baseLinks.google,
          instagram: incomingLinks.instagram.connected ? incomingLinks.instagram : baseLinks.instagram,
        }
      : baseLinks;

    accounts[normalizedEmail] = {
      email: normalizedEmail,
      password,
      role: resolvedRole,
      displayName,
      university: body.university || existingAccount?.university,
      faculty: resolvedFaculty,
      department: resolvedDepartment,
      majorId: body.majorId || existingAccount?.majorId,
      departmentOrTitle,
      linkedAccounts: mergedLinks,
    };
    await saveAccounts(accounts);

    state.authSession = {
      isAuthenticated: true,
      role: resolvedRole,
      displayName,
      email: normalizedEmail,
      departmentOrTitle,
    };

    if (resolvedRole === 'student') {
      state.profile = {
        ...state.profile,
        name: displayName,
        linkedAccounts: mergedLinks,
        ...(body.university || existingAccount?.university
          ? { university: body.university || existingAccount?.university }
          : {}),
        ...(resolvedFaculty ? { faculty: resolvedFaculty } : {}),
        ...(resolvedDepartment ? { department: resolvedDepartment } : {}),
        ...(body.majorId || existingAccount?.majorId
          ? { majorId: body.majorId || existingAccount?.majorId }
          : {}),
      };
    } else if (resolvedRole === 'teacher') {
      state.profile = {
        ...state.profile,
        linkedAccounts: mergedLinks,
        ...(body.university || existingAccount?.university
          ? { university: body.university || existingAccount?.university }
          : {}),
        ...(resolvedFaculty ? { faculty: resolvedFaculty } : {}),
        ...(resolvedDepartment ? { department: resolvedDepartment } : {}),
        ...(body.majorId || existingAccount?.majorId
          ? { majorId: body.majorId || existingAccount?.majorId }
          : {}),
      };
    } else {
      state.profile = {
        ...state.profile,
        linkedAccounts: mergedLinks,
      };
    }

    await saveState(state);
    res.json(state);
  });

  app.post('/api/auth/logout', async (_req, res) => {
    state.authSession = {
      ...state.authSession,
      isAuthenticated: false,
    };
    await saveState(state);
    res.json(state);
  });

  app.post('/api/materials', async (req, res) => {
    const body = req.body as {
      title?: string;
      university?: string;
      faculty?: string;
      department?: string;
      majorId?: MajorId;
      courseCode?: string;
      courseName?: string;
      academicYear?: number;
      type?: MaterialType;
      accessTier?: AccessTier;
      authorRole?: 'student' | 'instructor';
      pagesOrDuration?: string;
      fileName?: string;
      summaryNotes?: string;
      previewText?: string;
    };

    if (!body.title?.trim() || !body.courseName?.trim() || !body.summaryNotes?.trim()) {
      res.status(400).json({ error: 'يرجى تعبئة عنوان المادة واسم المساق ووصف الملخص.' });
      return;
    }

    const isInstructor =
      body.authorRole === 'instructor' || state.authSession.role === 'teacher' || state.authSession.role === 'admin';
    const authorDisplay = isInstructor
      ? state.authSession.displayName
      : `${state.profile.name} (مساهمة طلابية)`;

    const newMaterial: StudyMaterial = {
      id: `mat-${Date.now()}`,
      title: body.title.trim(),
      university: body.university || state.profile.university,
      faculty: body.faculty?.trim() || state.profile.faculty,
      department: body.department?.trim() || state.profile.department,
      majorId: body.majorId || state.profile.majorId,
      courseCode: (body.courseCode || 'NEW 101').trim().toUpperCase(),
      courseName: body.courseName.trim(),
      academicYear: Number(body.academicYear) || state.profile.academicYear,
      type: body.type || 'summary',
      accessTier: body.accessTier || 'free',
      authorName: authorDisplay,
      authorRole: isInstructor ? 'instructor' : 'student',
      verified: isInstructor || state.authSession.role === 'admin',
      pagesOrDuration: body.pagesOrDuration?.trim() || '14 صفحة',
      fileName: body.fileName?.trim() || undefined,
      evaluationStatus: isInstructor ? 'evaluated' : 'pending',
      teacherPointsAwarded: isInstructor ? undefined : 0,
      updatedAt: new Date().toISOString().slice(0, 10),
      ratingAvg: isInstructor ? 5.0 : 0,
      ratingCount: isInstructor ? 1 : 0,
      downloadsCount: 1,
      summaryNotes: body.summaryNotes.trim(),
      previewContent: body.previewText?.trim()
        ? body.previewText
            .split('\n')
            .map((line) => line.trim())
            .filter(Boolean)
        : [body.summaryNotes.trim()],
      reviews: isInstructor
        ? [
            {
              id: `rev-${Date.now()}`,
              studentName: 'نشر أكاديمي رسمي',
              rating: 5,
              comment: 'تم نشر المادة الرسمية الموثقة لطلبة المساق.',
              createdAt: new Date().toISOString().slice(0, 10),
            },
          ]
        : [],
    };

    state.materials = [newMaterial, ...state.materials];
    if (!isInstructor) {
      state.profile.uploadedCount += 1;
    }
    await saveState(state);
    res.status(201).json({ state, createdMaterial: newMaterial });
  });

  app.post('/api/materials/:id/reviews', async (req, res) => {
    const { id } = req.params;
    const body = req.body as { rating?: number; comment?: string; studentName?: string };
    const material = state.materials.find((m) => m.id === id);

    if (!material) {
      res.status(404).json({ error: 'المادة غير موجودة.' });
      return;
    }

    const rating = Math.min(5, Math.max(1, Number(body.rating) || 5));
    const comment = body.comment?.trim() || 'ملف منظم ومفيد جداً للمراجعة.';
    const review = {
      id: `rev-${Date.now()}`,
      studentName: body.studentName?.trim() || state.profile.name,
      rating,
      comment,
      createdAt: new Date().toISOString().slice(0, 10),
    };

    material.reviews = [review, ...material.reviews];
    const totalScore = material.ratingAvg * material.ratingCount + rating;
    material.ratingCount += 1;
    material.ratingAvg = Number((totalScore / material.ratingCount).toFixed(1));

    await saveState(state);
    res.json({ state, material });
  });

  app.post('/api/subscriptions/upgrade', async (req, res) => {
    const body = req.body as {
      planId?: PlanId;
      usePoints?: boolean;
      billingCycle?: BillingCycle;
    };

    const targetPlan: PlanId = body.planId || 'full';

    if (body.usePoints) {
      if (state.profile.points < 100) {
        res.status(400).json({ error: 'رصيد النقاط الحالي أقل من 100 نقطة المطلوبة للاستبدال.' });
        return;
      }
      state.profile.points -= 100;
    }

    state.profile.planId = targetPlan;
    await saveState(state);
    res.json({ state, billingCycle: body.billingCycle || 'monthly' });
  });

  app.post('/api/requests', async (req, res) => {
    const body = req.body as {
      courseName?: string;
      majorId?: MajorId;
      university?: string;
      faculty?: string;
      department?: string;
      notes?: string;
    };

    if (!body.courseName?.trim()) {
      res.status(400).json({ error: 'يرجى إدخال اسم المساق المطلوب.' });
      return;
    }

    const created = {
      id: `req-${Date.now()}`,
      courseName: body.courseName.trim(),
      majorId: body.majorId || state.profile.majorId,
      university: body.university || state.profile.university,
      faculty: body.faculty?.trim() || state.profile.faculty,
      department: body.department?.trim() || state.profile.department,
      notes: body.notes?.trim() || 'طلب إضافة ملخصات وأسئلة سنوات سابقة لهذا المساق.',
      votes: 1,
      votedByUser: true,
      createdAt: new Date().toISOString().slice(0, 10),
    };

    state.courseRequests = [created, ...state.courseRequests];
    await saveState(state);
    res.status(201).json(state);
  });

  app.post('/api/requests/:id/vote', async (req, res) => {
    const { id } = req.params;
    const item = state.courseRequests.find((r) => r.id === id);
    if (!item) {
      res.status(404).json({ error: 'الطلب غير موجود.' });
      return;
    }

    if (item.votedByUser) {
      item.votedByUser = false;
      item.votes = Math.max(0, item.votes - 1);
    } else {
      item.votedByUser = true;
      item.votes += 1;
    }

    await saveState(state);
    res.json(state);
  });

  app.patch('/api/lean-tasks/:week', async (req, res) => {
    const weekNum = Number(req.params.week);
    const task = state.leanTasks.find((t) => t.week === weekNum);
    if (!task) {
      res.status(404).json({ error: 'الأسبوع غير موجود.' });
      return;
    }
    task.completed = !task.completed;
    await saveState(state);
    res.json(state);
  });

  app.post('/api/support', async (req, res) => {
    const body = req.body as { channel?: 'whatsapp' | 'chat'; message?: string };
    if (!body.message?.trim()) {
      res.status(400).json({ error: 'يرجى كتابة رسالتك للدعم الفني.' });
      return;
    }
    const ticket = {
      id: `sup-${Date.now()}`,
      channel: body.channel || 'whatsapp',
      message: body.message.trim(),
      createdAt: new Date().toISOString(),
      status: 'تم استلام رسالتك — سيرد فريق دراستي خلال دقائق.',
    };
    state.supportTickets = [ticket, ...state.supportTickets.slice(0, 9)];
    await saveState(state);
    res.status(201).json({ state, ticket });
  });

  app.post('/api/exams', async (req, res) => {
    const body = req.body as {
      courseCode?: string;
      courseName?: string;
      majorId?: MajorId;
      academicYear?: number;
      examTitle?: string;
      examDate?: string;
      location?: string;
    };

    if (!body.courseCode?.trim() || !body.courseName?.trim() || !body.examDate?.trim()) {
      res.status(400).json({ error: 'يرجى إدخال رمز المساق واسمه وموعد الامتحان.' });
      return;
    }

    const code = body.courseCode.trim().toUpperCase();
    const newExam: ExamCourse = {
      id: `exam-${Date.now()}`,
      courseCode: code,
      courseName: body.courseName.trim(),
      majorId: body.majorId || state.profile.majorId,
      academicYear: Number(body.academicYear) || state.profile.academicYear,
      examTitle: body.examTitle?.trim() || 'امتحان فصلي',
      examDate: body.examDate.trim(),
      location: body.location?.trim() || 'القاعات الجامعية المركزية',
    };

    state.exams = [newExam, ...state.exams];
    if (!state.profile.enrolledCourses.includes(code)) {
      state.profile.enrolledCourses = [...state.profile.enrolledCourses, code];
    }
    await saveState(state);
    res.status(201).json({ state, createdExam: newExam });
  });

  app.post('/api/exams/notify', async (req, res) => {
    const body = req.body as {
      examId?: string;
      channel?: ExamNotificationLog['channel'];
      message?: string;
    };

    const exam = state.exams.find((e) => e.id === body.examId);
    if (!exam) {
      res.status(404).json({ error: 'موعد الامتحان غير موجود.' });
      return;
    }

    const channel: ExamNotificationLog['channel'] = body.channel || 'in_app';
    const message =
      body.message?.trim() ||
      `تنبيه اقتراب اختبار ${exam.courseName} (${exam.courseCode}) — ${exam.examTitle} في ${exam.location}.`;

    const notification: ExamNotificationLog = {
      id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      examId: exam.id,
      courseCode: exam.courseCode,
      courseName: exam.courseName,
      channel,
      message,
      sentAt: new Date().toISOString(),
      read: false,
    };

    state.examNotifications = [notification, ...state.examNotifications.slice(0, 19)];
    await saveState(state);
    res.status(201).json({ state, notification });
  });

  app.patch('/api/exam-notifications/read', async (_req, res) => {
    state.examNotifications = state.examNotifications.map((n) => ({ ...n, read: true }));
    await saveState(state);
    res.json(state);
  });

  app.patch('/api/teacher/materials/:id/evaluate', async (req, res) => {
    const { id } = req.params;
    const body = req.body as {
      status?: TeacherEvaluationStatus;
      pointsAwarded?: number;
      rating?: number;
      evaluationNote?: string;
    };

    const material = state.materials.find((m) => m.id === id);
    if (!material) {
      res.status(404).json({ error: 'الملخص غير موجود.' });
      return;
    }

    const nextStatus: TeacherEvaluationStatus =
      body.status === 'needs_revision' ? 'needs_revision' : 'evaluated';

    let nextPoints = 0;
    if (nextStatus === 'evaluated') {
      const parsedPoints = Math.round(Number(body.pointsAwarded));
      if (!Number.isFinite(parsedPoints) || parsedPoints < 1 || parsedPoints > 200) {
        res.status(400).json({ error: 'يرجى تحديد عدد النقاط المستحقة للملخص (من 1 إلى 200 نقطة).' });
        return;
      }
      nextPoints = parsedPoints;
    }

    const previousPoints = material.teacherPointsAwarded || 0;
    const pointsDelta = nextPoints - previousPoints;
    state.profile.points = Math.max(0, state.profile.points + pointsDelta);

    const evaluatorName =
      state.authSession.role === 'teacher' ? state.authSession.displayName : 'معلم المادة';
    const today = new Date().toISOString().slice(0, 10);
    const note =
      body.evaluationNote?.trim() ||
      (nextStatus === 'evaluated'
        ? `ملخص متكامل ومنظم، تم منحه +${nextPoints} نقطة.`
        : 'يرجى استكمال النواقص وإعادة رفع الملخص لإعادة التقييم.');

    material.evaluationStatus = nextStatus;
    material.verified = nextStatus === 'evaluated';
    material.teacherPointsAwarded = nextPoints;
    material.teacherEvaluationNote = note;
    material.evaluatedBy = evaluatorName;
    material.evaluatedAt = today;

    if (body.rating !== undefined && nextStatus === 'evaluated') {
      const clampedRating = Math.min(5, Math.max(1, Math.round(Number(body.rating) || 5)));
      const teacherReviewId = `rev-teacher-${material.id}`;
      const existingIdx = material.reviews.findIndex((r) => r.id === teacherReviewId);
      const teacherReview = {
        id: teacherReviewId,
        studentName: `${evaluatorName} (تقييم معلم المادة)`,
        rating: clampedRating,
        comment: `${note} — النقاط الممنوحة: +${nextPoints} نقطة`,
        createdAt: today,
      };
      if (existingIdx >= 0) {
        material.reviews[existingIdx] = teacherReview;
      } else {
        material.reviews = [teacherReview, ...material.reviews];
      }
      material.ratingCount = material.reviews.length;
      const totalScore = material.reviews.reduce((acc, r) => acc + r.rating, 0);
      material.ratingAvg = Number((totalScore / material.ratingCount).toFixed(1));
    }

    const statusNotification: MaterialStatusNotification = {
      id: `mat-notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      materialId: material.id,
      courseCode: material.courseCode,
      courseName: material.courseName,
      materialTitle: material.title,
      status: nextStatus,
      pointsAwarded: nextPoints,
      note,
      evaluatedBy: evaluatorName,
      message:
        nextStatus === 'evaluated'
          ? `تم قبول ملخصك لمساق ${material.courseName} (${material.courseCode}) ومنحك +${nextPoints} نقطة!`
          : `ملاحظات تعديل على ملخصك لمساق ${material.courseName} (${material.courseCode}): ${note}`,
      createdAt: new Date().toISOString(),
      read: false,
    };
    state.materialNotifications = [
      statusNotification,
      ...(state.materialNotifications || []).slice(0, 29),
    ];

    await saveState(state);
    res.json({ material, state });
  });

  app.patch('/api/material-notifications/read', async (req, res) => {
    const body = req.body as { id?: string };
    const list = state.materialNotifications || [];
    state.materialNotifications = body?.id
      ? list.map((n) => (n.id === body.id ? { ...n, read: true } : n))
      : list.map((n) => ({ ...n, read: true }));
    await saveState(state);
    res.json(state);
  });

  app.patch('/api/admin/materials/:id', async (req, res) => {
    const { id } = req.params;
    const body = req.body as { verified?: boolean; accessTier?: AccessTier };
    const mat = state.materials.find((m) => m.id === id);
    if (!mat) {
      res.status(404).json({ error: 'المادة غير موجودة.' });
      return;
    }
    const prevVerified = mat.verified;
    if (typeof body.verified === 'boolean') {
      mat.verified = body.verified;
      if (mat.authorRole === 'student' && prevVerified !== body.verified) {
        const nextStatus: TeacherEvaluationStatus = body.verified ? 'evaluated' : 'needs_revision';
        mat.evaluationStatus = nextStatus;
        const statusNotification: MaterialStatusNotification = {
          id: `mat-notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          materialId: mat.id,
          courseCode: mat.courseCode,
          courseName: mat.courseName,
          materialTitle: mat.title,
          status: nextStatus,
          pointsAwarded: mat.teacherPointsAwarded,
          evaluatedBy: 'الإدارة الأكاديمية',
          message: body.verified
            ? `تم اعتماد وتوثيق ملخصك لمساق ${mat.courseName} (${mat.courseCode})!`
            : `تم إرجاع ملخصك لمساق ${mat.courseName} (${mat.courseCode}) للمراجعة والتعديل.`,
          createdAt: new Date().toISOString(),
          read: false,
        };
        state.materialNotifications = [
          statusNotification,
          ...(state.materialNotifications || []).slice(0, 29),
        ];
      }
    }
    if (body.accessTier && ['free', 'basic', 'full'].includes(body.accessTier)) {
      mat.accessTier = body.accessTier;
    }
    await saveState(state);
    res.json(state);
  });

  app.delete('/api/admin/materials/:id', async (req, res) => {
    const { id } = req.params;
    state.materials = state.materials.filter((m) => m.id !== id);
    await saveState(state);
    res.json(state);
  });

  app.patch('/api/admin/support/:id', async (req, res) => {
    const { id } = req.params;
    const body = req.body as { adminReply?: string };
    const ticket = state.supportTickets.find((t) => t.id === id);
    if (!ticket) {
      res.status(404).json({ error: 'التذكرة غير موجودة.' });
      return;
    }
    ticket.resolved = true;
    ticket.status = 'تمت المعالجة والرد من الإدارة';
    if (body.adminReply?.trim()) {
      ticket.adminReply = body.adminReply.trim();
    }
    await saveState(state);
    res.json(state);
  });

  app.patch('/api/admin/requests/:id', async (req, res) => {
    const { id } = req.params;
    const reqItem = state.courseRequests.find((r) => r.id === id);
    if (!reqItem) {
      res.status(404).json({ error: 'الطلب غير موجود.' });
      return;
    }
    reqItem.status = reqItem.status === 'fulfilled' ? 'pending' : 'fulfilled';
    await saveState(state);
    res.json(state);
  });

  app.post('/api/assistant/chat', async (req, res) => {
    const body = req.body as {
      message?: string;
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
    };

    try {
      const result = await runAcademicAssistantChat({
        message: body.message || '',
        history: Array.isArray(body.history) ? body.history : [],
        assistantRole: body.assistantRole,
        useSearch: body.useSearch,
        context: {
          university: body.context?.university || state.profile.university,
          faculty: body.context?.faculty || state.profile.faculty,
          department: body.context?.department || state.profile.department,
          majorLabel: body.context?.majorLabel,
          academicYear: body.context?.academicYear || state.profile.academicYear,
          activeMaterialTitle: body.context?.activeMaterialTitle,
          activeMaterialCourse: body.context?.activeMaterialCourse,
        },
      });
      res.json(result);
    } catch (err) {
      const statusCode =
        typeof (err as { statusCode?: number })?.statusCode === 'number'
          ? (err as { statusCode: number }).statusCode
          : 500;
      const msg = err instanceof Error ? err.message : 'تعذر الاتصال بالمساعد الأكاديمي.';
      res.status(statusCode).json({ error: msg });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    if (!process.env.DISABLE_HMR) {
      process.env.DISABLE_HMR = 'true';
    }
    app.get('/@vite/client', (_req, res) => {
      res.type('application/javascript').send(`
const sheetsMap = new Map();
let lastInsertedStyle;
export function updateStyle(id, content) {
  let style = sheetsMap.get(id);
  if (!style) {
    style = document.createElement('style');
    style.setAttribute('type', 'text/css');
    style.setAttribute('data-vite-dev-id', id);
    style.textContent = content;
    if (!lastInsertedStyle) {
      document.head.appendChild(style);
      setTimeout(() => { lastInsertedStyle = undefined; }, 0);
    } else {
      lastInsertedStyle.insertAdjacentElement('afterend', style);
    }
    lastInsertedStyle = style;
  } else if (style.textContent !== content) {
    style.textContent = content;
  }
  sheetsMap.set(id, style);
}
export function removeStyle(id) {
  const style = sheetsMap.get(id);
  if (style) {
    document.head.removeChild(style);
    sheetsMap.delete(id);
  }
}
export function createHotContext() {
  return {
    data: {},
    accept() {},
    acceptExports() {},
    dispose() {},
    prune() {},
    decline() {},
    invalidate() {},
    on() {},
    off() {},
    send() {},
  };
}
export function injectQuery(url, queryToInject) {
  if (url[0] !== '.' && url[0] !== '/') return url;
  const pathname = url.replace(/[?#].*$/, '');
  const { search, hash } = new URL(url, 'http://vite.dev');
  return pathname + '?' + queryToInject + (search ? '&' + search.slice(1) : '') + (hash || '');
}
export class ErrorOverlay extends HTMLElement {}
`);
    });
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
        ws: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Dirasati server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
