import type { Locale } from '@/lib/locale'

const words = {
  home: { ar: 'الرئيسية', ckb: 'سەرەکی', en: 'Home' },
  grades: { ar: 'الدرجات', ckb: 'نمرەکان', en: 'Grades' },
  assignments: { ar: 'الواجبات', ckb: 'ئەرکەکان', en: 'Assignments' },
  attendance: { ar: 'الحضور', ckb: 'ئامادەبوون', en: 'Attendance' },
  calendar: { ar: 'التقويم', ckb: 'ڕۆژژمێر', en: 'Calendar' },
  notices: { ar: 'الإعلانات', ckb: 'ڕاگەیاندنەکان', en: 'Announcements' },
  messages: { ar: 'الرسائل', ckb: 'نامەکان', en: 'Messages' },
  account: { ar: 'حسابي', ckb: 'هەژمارم', en: 'My account' },
  signOut: { ar: 'تسجيل الخروج', ckb: 'چوونەدەرەوە', en: 'Sign out' },
  portal: { ar: 'بوابة الطالب', ckb: 'دەروازەی قوتابی', en: 'Student portal' },
  welcome: { ar: 'أهلًا', ckb: 'بەخێربێیت', en: 'Welcome' },
  today: { ar: 'اليوم', ckb: 'ئەمڕۆ', en: 'Today' },
  gradeAverage: { ar: 'المعدل العام', ckb: 'تێکڕای نمرە', en: 'Overall average' },
  assignmentsDue: { ar: 'واجبات قريبة', ckb: 'ئەرکی نزیک', en: 'Upcoming assignments' },
  attendanceRate: { ar: 'سجل الحضور', ckb: 'تۆماری ئامادەبوون', en: 'Attendance record' },
  nextUp: { ar: 'القادم إليك', ckb: 'داهاتوو', en: 'Coming up' },
  latestGrades: { ar: 'آخر الدرجات', ckb: 'نوێترین نمرەکان', en: 'Latest grades' },
  recentNotices: { ar: 'آخر الإعلانات', ckb: 'نوێترین ڕاگەیاندنەکان', en: 'Latest announcements' },
  viewAll: { ar: 'عرض الكل', ckb: 'بینینی هەموو', en: 'View all' },
  subject: { ar: 'المادة', ckb: 'بابەت', en: 'Subject' },
  assessment: { ar: 'التقييم', ckb: 'هەڵسەنگاندن', en: 'Assessment' },
  score: { ar: 'النتيجة', ckb: 'ئەنجام', en: 'Score' },
  dueDate: { ar: 'موعد التسليم', ckb: 'کاتی پێشکەشکردن', en: 'Due date' },
  status: { ar: 'الحالة', ckb: 'دۆخ', en: 'Status' },
  submitted: { ar: 'تم التسليم', ckb: 'پێشکەشکراوە', en: 'Submitted' },
  pending: { ar: 'قيد الإنجاز', ckb: 'لە ئەنجامداندایە', en: 'In progress' },
  present: { ar: 'حاضر', ckb: 'ئامادە', en: 'Present' },
  late: { ar: 'متأخر', ckb: 'دواکەوتوو', en: 'Late' },
  absent: { ar: 'غائب', ckb: 'غایب', en: 'Absent' },
  excused: { ar: 'بعذر', ckb: 'بە پاساو', en: 'Excused' },
  noData: { ar: 'لا توجد بيانات للعرض بعد.', ckb: 'هێشتا هیچ زانیارییەک نییە.', en: 'No information to show yet.' },
  noAssignments: { ar: 'ما عندك واجبات قريبة.', ckb: 'هیچ ئەرکێکی نزیکت نییە.', en: 'You have no upcoming assignments.' },
  noGrades: { ar: 'ستظهر درجاتك هنا بعد نشرها.', ckb: 'نمرەکانت دوای بڵاوکردنەوە لێرە دەردەکەون.', en: 'Your grades will appear here when published.' },
  noAttendance: { ar: 'ماكو سجلات حضور بعد.', ckb: 'هێشتا تۆماری ئامادەبوون نییە.', en: 'There are no attendance records yet.' },
  noEvents: { ar: 'ماكو مواعيد قادمة.', ckb: 'هیچ ڕووداوێکی داهاتوو نییە.', en: 'There are no upcoming events.' },
  noNotices: { ar: 'ماكو إعلانات جديدة.', ckb: 'هیچ ڕاگەیاندنێکی نوێ نییە.', en: 'There are no new announcements.' },
  login: { ar: 'دخول الطالب', ckb: 'چوونەژوورەوەی قوتابی', en: 'Student sign in' },
  usernameOrEmail: { ar: 'اسم المستخدم أو البريد أو رقم الهاتف', ckb: 'ناوی بەکارهێنەر یان ئیمەیڵ یان ژمارەی مۆبایل', en: 'Username, email, or phone' },
  password: { ar: 'كلمة المرور', ckb: 'وشەی نهێنی', en: 'Password' },
  continue: { ar: 'متابعة', ckb: 'بەردەوامبوون', en: 'Continue' },
  preview: { ar: 'معاينة الواجهة ببيانات تجريبية', ckb: 'بینینی ڕووکار بە زانیاریی نموونەیی', en: 'Preview with sample data' },
  previewBanner: { ar: 'وضع المعاينة · هذه بيانات تجريبية وليست سجلات حقيقية', ckb: 'دۆخی پیشاندان · ئەم زانیارییانە نموونەیین و تۆماری ڕاستەقینە نین', en: 'Preview mode · Sample data, not real records' },
  language: { ar: 'اللغة', ckb: 'زمان', en: 'Language' },
  class: { ar: 'الصف', ckb: 'پۆل', en: 'Class' },
  studentNumber: { ar: 'الرقم الطلابي', ckb: 'ژمارەی قوتابی', en: 'Student number' },
  profile: { ar: 'المعلومات الشخصية', ckb: 'زانیاریی کەسی', en: 'Personal information' },
  name: { ar: 'الاسم', ckb: 'ناو', en: 'Name' },
  email: { ar: 'البريد الإلكتروني', ckb: 'ئیمەیڵ', en: 'Email' },
  phone: { ar: 'الهاتف', ckb: 'مۆبایل', en: 'Phone' },
  save: { ar: 'حفظ التغييرات', ckb: 'پاشەکەوتکردنی گۆڕانکارییەکان', en: 'Save changes' },
  searchContact: { ar: 'ابحث بالاسم أو الرقم الطلابي', ckb: 'بە ناو یان ژمارەی قوتابی بگەڕێ', en: 'Search by name or student number' },
  sendMessage: { ar: 'اكتب رسالتك هنا', ckb: 'نامەکەت لێرە بنووسە', en: 'Write your message here' },
  send: { ar: 'إرسال', ckb: 'ناردن', en: 'Send' },
  waiting: { ar: 'بانتظار قبول طلب التواصل', ckb: 'چاوەڕێی پەسەندکردنی داواکاری پەیوەندین', en: 'Waiting for the contact request to be accepted' },
  contactRequest: { ar: 'طلب تواصل جديد', ckb: 'داواکاری پەیوەندی نوێ', en: 'New contact request' },
  accept: { ar: 'قبول', ckb: 'پەسەندکردن', en: 'Accept' },
  reject: { ar: 'رفض', ckb: 'ڕەتکردنەوە', en: 'Reject' },
  noMessages: { ar: 'اختَر حسابًا من المدرسة لبدء محادثة.', ckb: 'هەژمارێکی قوتابخانە هەڵبژێرە بۆ دەستپێکردنی گفتوگۆ.', en: 'Choose a school account to start a conversation.' },
  event: { ar: 'موعد', ckb: 'ڕووداو', en: 'Event' },
  location: { ar: 'الموقع', ckb: 'شوێن', en: 'Location' },
  noLocation: { ar: 'بدون موقع محدد', ckb: 'شوێن دیاری نەکراوە', en: 'No location specified' },
  markRead: { ar: 'إخفاء التنبيه', ckb: 'شاردنەوەی ئاگاداری', en: 'Dismiss alert' },
  noTeacherMessage: { ar: 'تعذر تحميل البيانات. حاول تحديث الصفحة.', ckb: 'بارکردنی زانیاری سەرکەوتوو نەبوو. پەڕەکە نوێ بکەرەوە.', en: 'Could not load data. Please refresh the page.' },
} as const

export type MessageKey = keyof typeof words
export function t(locale: Locale, key: MessageKey) {
  return words[key][locale]
}

export function localizedDate(value: Date, locale: Locale, options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }) {
  const localeName = locale === 'ckb' ? 'ckb-IQ' : locale === 'ar' ? 'ar-IQ' : 'en-IQ'
  try { return new Intl.DateTimeFormat(localeName, options).format(value) }
  catch { return new Intl.DateTimeFormat(locale === 'en' ? 'en' : 'ar-IQ', options).format(value) }
}
