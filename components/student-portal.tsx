'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Home, BookOpen, ClipboardCheck, CalendarDays, CalendarCheck, Bell, MessageCircle, UserRound, Search, ChevronLeft, ChevronDown, Menu, X, ArrowUpLeft, Clock3, MapPin, CheckCircle2, CircleAlert, LogOut, Sparkles, TrendingUp, UsersRound } from 'lucide-react'
import { stopPreview } from '@/app/preview-actions'
import { t, type MessageKey } from '@/lib/i18n'
import type { Locale } from '@/lib/locale'
import { saveSocialPreferencesAction } from '@/app/account/actions'

const links: { href: string; key: MessageKey; icon: typeof Home }[] = [
  { href: '/', key: 'home', icon: Home }, { href: '/grades', key: 'grades', icon: BookOpen },
  { href: '/assignments', key: 'assignments', icon: ClipboardCheck }, { href: '/attendance', key: 'attendance', icon: CalendarCheck },
  { href: '/calendar', key: 'calendar', icon: CalendarDays }, { href: '/notifications', key: 'notices', icon: Bell },
  { href: '/messages', key: 'messages', icon: MessageCircle }, { href: '/account', key: 'account', icon: UserRound },
]
const titles: Record<string, MessageKey> = { '/': 'home', '/grades': 'grades', '/assignments': 'assignments', '/attendance': 'attendance', '/calendar': 'calendar', '/notifications': 'notices', '/messages': 'messages', '/account': 'account' }
const grades = [['الرياضيات', 'اختبار الوحدة الثانية', '٩٢'], ['اللغة العربية', 'التعبير والإنشاء', '٨٨'], ['العلوم', 'الطاقة والتحولات', '٩٥'], ['اللغة الإنكليزية', 'Reading quiz', '٨٦']]
const assignments = [['الرياضيات', 'حل تمارين صفحة ٤٢', 'اليوم · ٨:٠٠ م', 'قريب'], ['العلوم', 'ملخص الجهاز الهضمي', 'الخميس · ١٠:٠٠ ص', 'قيد الإنجاز'], ['اللغة العربية', 'قراءة قصة قصيرة', 'الأحد القادم', 'تم التسليم']]
const agenda = [['٨:٠٠', 'الرياضيات', 'قاعة ١٢'], ['٩:٠٠', 'اللغة العربية', 'قاعة ٨'], ['١٠:٠٠', 'العلوم', 'مختبر العلوم'], ['١١:٠٠', 'اللغة الإنكليزية', 'قاعة ١٠']]

export function StudentPortal({ section, preview, initialLocale, socialEnabled, socialAudience, children }: { section: string; preview: boolean; initialLocale: Locale; socialEnabled: boolean; socialAudience: 'contacts' | 'school' | 'platform'; children: React.ReactNode }) {
  const pathname = usePathname()
  const [locale, setLocale] = useState<Locale>(initialLocale)
  const [menuOpen, setMenuOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [now, setNow] = useState<Date | null>(null)
  const rtl = locale !== 'en'
  const title = pathname === '/community' ? (locale === 'en' ? 'Community' : 'المجتمع') : t(locale, titles[pathname] ?? 'home')
  useEffect(() => setMenuOpen(false), [pathname])
  useEffect(() => {
    const media = window.matchMedia('(min-width: 1101px)')
    const closeOnDesktop = () => { if (media.matches) setMenuOpen(false) }
    media.addEventListener('change', closeOnDesktop)
    return () => media.removeEventListener('change', closeOnDesktop)
  }, [])
  useEffect(() => {
    const refresh = () => setNow(new Date())
    refresh()
    const timer = window.setInterval(refresh, 60_000)
    return () => window.clearInterval(timer)
  }, [])
  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [menuOpen])
  useEffect(() => {
    document.documentElement.lang = locale === 'ckb' ? 'ckb-IQ' : locale === 'ar' ? 'ar-IQ' : 'en'
    document.documentElement.dir = rtl ? 'rtl' : 'ltr'
    document.cookie = `school_pulse_locale=${locale}; path=/; max-age=31536000; samesite=lax`
  }, [locale, rtl])
  const changeLocale = (value: string) => { if (value === 'ar' || value === 'ckb' || value === 'en') setLocale(value) }
  return <div className={`portal ${rtl ? 'rtl' : 'ltr'}`}>
    {menuOpen && <button className="mobile-scrim" aria-label="إغلاق القائمة" onClick={() => setMenuOpen(false)} />}
    <aside className={`sidebar ${menuOpen ? 'sidebar-open' : ''}`}>
      <div className="brand"><span className="brand-mark"><BookOpen size={21}/></span><span><b>مَدارِس</b><small>بوابة الطالب</small></span><button className="icon-btn close-menu" onClick={() => setMenuOpen(false)} aria-label="إغلاق"><X size={19}/></button></div>
      <div className="school-chip"><span className="school-avatar">ن</span><span><b>مدرسة النور الأهلية</b><small>المرحلة المتوسطة</small></span><ChevronDown size={15}/></div>
      <div className="nav-label">القائمة الرئيسية</div>
      <nav className="side-nav">{links.map(({ href, key, icon: Icon }) => <Link key={href} href={href} onClick={() => setMenuOpen(false)} className={`nav-link ${pathname === href ? 'active' : ''}`}><Icon size={18}/><span>{t(locale, key)}</span>{href === '/notifications' && <i className="nav-dot"/>}</Link>)}<Link href="/community" onClick={() => setMenuOpen(false)} className={`nav-link ${pathname.startsWith('/community') ? 'active' : ''}`}><UsersRound size={18}/><span>{locale === 'en' ? 'Community' : 'المجتمع'}</span></Link></nav>
      <div className="sidebar-bottom"><div className="help-card"><div className="help-icon"><Sparkles size={16}/></div><b>تحتاج مساعدة؟</b><p>تواصل مع إدارة المدرسة لأي استفسار.</p><Link href="/messages">مركز المساعدة <ChevronLeft size={14}/></Link></div><div className="student-mini"><span className="avatar">ع</span><span><b>علي محمد حسن</b><small>الصف الثاني · ب</small></span><button className="icon-btn" onClick={() => void stopPreview()} aria-label="تسجيل الخروج"><LogOut size={16}/></button></div></div>
    </aside>
    <main className="main-area">
      <header className="topbar"><div className="topbar-start"><button className="icon-btn mobile-menu" onClick={() => setMenuOpen(true)} aria-label="القائمة"><Menu size={20}/></button><div className="crumb"><span>بوابة الطالب</span><ChevronLeft size={14}/><b>{title}</b></div></div><div className="top-actions"><label className="search-box"><Search size={16}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="ابحث في البوابة..."/><kbd>⌘ K</kbd></label><select className="locale-select" value={locale} onChange={e => changeLocale(e.target.value)} aria-label="اللغة"><option value="ckb">کوردی</option><option value="ar">العربية</option><option value="en">English</option></select><button className="icon-btn notification-btn" aria-label="الإشعارات"><Bell size={19}/><i/></button><span className="top-avatar">ع</span></div></header>
      <div className="page-wrap">
        {preview && <div className="preview-banner"><Sparkles size={16}/><span>{t(locale, 'previewBanner')}</span></div>}
        <div className="page-heading"><div><div className="eyebrow">{now ? new Intl.DateTimeFormat(locale === 'ckb' ? 'ckb-IQ' : locale === 'ar' ? 'ar-IQ' : 'en-IQ', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(now) : '...'} <span className="live-dot"/> الفصل الدراسي الأول</div><h1>{pathname === '/' ? <>{greeting(now?.getHours() ?? 9, locale)}، علي <span className="wave">✦</span></> : title}</h1><p>{pathname === '/' ? 'هذا ملخص يومك الدراسي. بالتوفيق في دراستك!' : headingDescription(pathname)}</p></div>{pathname === '/' && <button className="date-button"><CalendarDays size={16}/> جدول اليوم <ChevronDown size={14}/></button>}</div>
        {pathname.startsWith('/community') ? children : renderSection(pathname, query, locale, changeLocale, socialEnabled, socialAudience)}
        <footer className="page-footer"><span>© ٢٠٢٦ مدارس · نظام إدارة المدرسة</span><span>صُنع لرحلتك التعليمية <span className="heart">♥</span></span></footer>
      </div>
    </main>
    <nav className="mobile-nav">{links.slice(0,5).map(({href,key,icon:Icon})=><Link href={href} key={href} className={pathname===href?'active':''}><Icon size={19}/><span>{t(locale,key)}</span></Link>)}</nav>
  </div>
}

function greeting(hour: number, locale: Locale) {
  if (locale === 'en') return hour >= 5 && hour < 12 ? 'Good morning' : hour >= 12 && hour < 17 ? 'Welcome' : 'Good evening'
  if (locale === 'ckb') return hour >= 5 && hour < 12 ? 'بەیانی باش' : hour >= 12 && hour < 17 ? 'بەخێربێیت' : 'ئێوارە باش'
  return hour >= 5 && hour < 12 ? 'صباح الخير' : hour >= 12 && hour < 17 ? 'أهلًا بك' : 'مساء النور'
}

function headingDescription(path: string) { return ({ '/grades':'تابع نتائجك وتقدّمك في كل مادة دراسية.', '/assignments':'كل مهامك الدراسية ومواعيد التسليم في مكان واحد.', '/attendance':'سجل حضورك واطّلع على ملخص أيامك الدراسية.', '/calendar':'مواعيدك واختباراتك وفعاليات المدرسة القادمة.', '/notifications':'آخر التنبيهات والتحديثات الخاصة بك.', '/messages':'تواصل مع معلميك وإدارة المدرسة.', '/account':'راجع معلوماتك الشخصية وتفضيلات حسابك.' } as Record<string,string>)[path] ?? 'تابع تفاصيلك الدراسية أولًا بأول.' }

function renderSection(path: string, query: string, locale: Locale, changeLocale: (value: string) => void, socialEnabled: boolean, socialAudience: 'contacts' | 'school' | 'platform') {
  if (path === '/grades') return <><section className="metric-row"><Metric icon={<TrendingUp/>} label="المعدل الفصلي" value="٩٠٫٢٪" note="أعلى من الفصل السابق بـ ٤٪" tone="mint"/><Metric icon={<BookOpen/>} label="المواد الدراسية" value="٨ مواد" note="تم نشر ٢٤ تقييمًا" tone="blue"/><Metric icon={<Sparkles/>} label="أفضل مادة" value="العلوم" note="معدلك فيها ٩٥٪" tone="peach"/></section><section className="panel"><PanelHead title="درجات المواد" caption="الفصل الدراسي الأول · ٢٠٢٦" action="تنزيل كشف الدرجات"/><div className="table-wrap"><table><thead><tr><th>المادة</th><th>آخر تقييم</th><th>الدرجة</th><th>المعدل</th><th>التقدم</th></tr></thead><tbody>{grades.filter(r=>r.join(' ').includes(query)).map((r,i)=><tr key={r[0]}><td><span className={`subject-dot sd-${i}`}/><b>{r[0]}</b></td><td>{r[1]}</td><td><b>{r[2]}<small className="muted"> / ١٠٠</small></b></td><td>{[91,88,95,86][i]}٪</td><td><div className="progress-track"><i style={{width:`${[91,88,95,86][i]}%`}}/></div></td></tr>)}</tbody></table></div></section></>;
  if (path === '/assignments') return <section className="panel"><PanelHead title="الواجبات والمهام" caption="٣ مهام في هذا الأسبوع"/><div className="task-list">{assignments.filter(r=>r.join(' ').includes(query)).map((r,i)=><div className="task-row" key={r[1]}><span className={`task-icon task-${i}`}><ClipboardCheck size={19}/></span><div className="task-main"><b>{r[1]}</b><small>{r[0]} · تسليم {r[2]}</small></div><span className={`status-pill ${i===2?'done':i===0?'urgent':''}`}>{r[3]}</span><button className="icon-btn"><ArrowUpLeft size={17}/></button></div>)}</div></section>;
  if (path === '/attendance') return <><section className="metric-row"><Metric icon={<CalendarCheck/>} label="نسبة الحضور" value="٩٦٪" note="ممتاز، استمر على هذا المستوى" tone="mint"/><Metric icon={<CheckCircle2/>} label="أيام الحضور" value="٤٨ يوم" note="من أصل ٥٠ يومًا" tone="blue"/><Metric icon={<CircleAlert/>} label="الغياب والتأخير" value="يومان" note="غياب واحد · تأخير واحد" tone="peach"/></section><section className="panel"><PanelHead title="سجل الحضور" caption="آخر الأيام الدراسية"/><div className="attendance-list">{['الأربعاء ١٨ تشرين الثاني','الثلاثاء ١٧ تشرين الثاني','الاثنين ١٦ تشرين الثاني','الأحد ١٥ تشرين الثاني','الخميس ١٢ تشرين الثاني'].map((d,i)=><div className="attendance-row" key={d}><span className="calendar-date">{18-i}<small>نوف</small></span><b>{d}</b><span className={`status-pill ${i===3?'urgent':''}`}>{i===3?'غائب':i===4?'متأخر':'حاضر'}</span></div>)}</div></section></>;
  if (path === '/calendar') return <section className="panel"><PanelHead title="تقويم المدرسة" caption="تشرين الثاني ٢٠٢٦" action="هذا الأسبوع"/><div className="calendar-grid">{['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'].map(x=><b key={x}>{x}</b>)}{Array.from({length:35},(_,i)=><div className={`calendar-cell ${i===17?'today':''} ${[19,23,28].includes(i)?'has-event':''}`} key={i}>{i<30?i+1:''}{[19,23,28].includes(i)&&<small>{i===19?'اختبار رياضيات':i===23?'تسليم واجب':'فعالية المدرسة'}</small>}</div>)}</div></section>;
  if (path === '/notifications') return <section className="panel"><PanelHead title="الإشعارات" caption="آخر التحديثات من المدرسة"/><div className="task-list">{[['تم نشر درجة اختبار العلوم','أضافت المعلمة سارة درجة جديدة لمادة العلوم.','منذ ٢٠ دقيقة'],['تذكير بموعد تسليم الواجب','واجب الرياضيات مستحق اليوم الساعة ٨ مساءً.','قبل ساعتين'],['إعلان: رحلة مدرسية','يرجى مراجعة الإدارة لتأكيد المشاركة في الرحلة.','أمس']].map((r,i)=><div className="task-row" key={r[0]}><span className="task-icon"><Bell size={18}/></span><div className="task-main"><b>{r[0]}</b><small>{r[1]}</small></div><span className="muted">{r[2]}</span><i className={i===0?'unread':''}/></div>)}</div></section>;
  if (path === '/messages') return <section className="panel message-panel"><div className="message-side"><PanelHead title="المحادثات" caption="معلموك وإدارة المدرسة"/><label className="search-box message-search"><Search size={16}/><input placeholder="ابحث عن محادثة"/></label>{['الأستاذة سارة أحمد','إدارة المدرسة','الأستاذ عمر علي'].map((n,i)=><div className={`contact-row ${i===0?'selected':''}`} key={n}><span className="avatar">{n.slice(0,1)}</span><span><b>{n}</b><small>{['وصلتني درجة العلوم، شكرًا أستاذة.','موعد الاجتماع يوم الخميس.','يرجى مراجعة الواجب.'][i]}</small></span></div>)}</div><div className="chat-empty"><MessageCircle size={32}/><b>اختَر محادثة</b><span>تواصل بأمان مع معلميك وإدارة المدرسة.</span></div></section>;
  if (path === '/account') return <section className="panel account-panel"><PanelHead title="معلومات الطالب" caption="معلوماتك الشخصية المسجلة لدى المدرسة"/><div className="profile-banner"><span className="profile-avatar">ع</span><div><h2>علي محمد حسن</h2><p>طالب · الصف الثاني المتوسط · الشعبة ب</p></div><span className="status-pill done">حساب نشط</span></div><div className="account-grid">{[['الاسم الكامل','علي محمد حسن'],['البريد الإلكتروني','ali.student@school.edu.iq'],['رقم الهاتف','0770 123 4567'],['الرقم الطلابي','ST-2026-0148'],['الصف والشعبة','الثاني المتوسط · ب'],['المدرسة','مدرسة النور الأهلية']].map(([a,b])=><div className="account-field" key={a}><small>{a}</small><b>{b}</b></div>)}</div><div className="account-language"><div><b>لغة الواجهة</b><small>اختَر اللغة المناسبة لك</small></div><select value={locale} onChange={e => changeLocale(e.target.value)}><option value="ckb">کوردی · سورانی</option><option value="ar">العربية</option><option value="en">English</option></select></div><form action={saveSocialPreferencesAction} className="social-settings"><div><b>المشاركة في المجتمع</b><small>إيقافها يخفي المنشورات والتفاعلات عنك ويحفظها لحين تفعيلها.</small></div><label><input type="checkbox" name="socialEnabled" defaultChecked={socialEnabled}/> تفعيل</label><label>من يستطيع مراسلتك اجتماعيًا<select name="socialMessageAudience" defaultValue={socialAudience}><option value="contacts">جهات الاتصال المقبولة</option><option value="school">أعضاء مدرستي</option><option value="platform">أعضاء المنصة</option></select></label><button className="primary-btn">حفظ إعدادات المجتمع</button></form><button className="primary-btn">تعديل المعلومات <ArrowUpLeft size={16}/></button></section>;
  return <Dashboard/>;
}

function Metric({icon,label,value,note,tone}:{icon:React.ReactNode;label:string;value:string;note:string;tone:string}) { return <article className="metric-card"><div className={`metric-icon ${tone}`}>{icon}</div><span>{label}</span><strong>{value}</strong><small>{note}</small></article> }
function PanelHead({title,caption,action}:{title:string;caption:string;action?:string}) { return <div className="panel-head"><div><h2>{title}</h2><p>{caption}</p></div>{action&&<button className="text-action">{action}<ArrowUpLeft size={15}/></button>}</div> }

function Dashboard() { return <><section className="hero-grid"><div className="hero-card"><div className="hero-copy"><span className="hero-tag"><Sparkles size={14}/> خطوتك القادمة تبدأ اليوم</span><h2>كل يوم فرصة جديدة<br/>لتكون أفضل.</h2><p>أنت تحرز تقدمًا رائعًا هذا الفصل. واصل تنظيم وقتك وإنجاز مهامك.</p><Link href="/assignments" className="hero-cta">عرض واجباتي <ArrowUpLeft size={16}/></Link></div><div className="hero-art"><div className="orbit orbit-one"/><div className="orbit orbit-two"/><div className="book-stack"><BookOpen size={76}/></div><span className="art-star star-one">✦</span><span className="art-star star-two">✧</span><span className="art-pill">أحسنت! ٩٠٪</span></div></div><aside className="streak-card"><div className="streak-head"><span className="streak-icon">✦</span><span><b>تقدّمك الدراسي</b><small>هذا الفصل الدراسي</small></span></div><div className="streak-score">٩٠٫٢<small>%</small><span>المعدل العام</span></div><div className="mini-chart">{[35,48,42,60,56,76,68,92,84,100].map((h,i)=><i key={i} style={{height:`${h}%`}}/>)}</div><small className="positive">↑ ٤٪ عن الفصل السابق</small><Link href="/grades" className="streak-link">تفاصيل الدرجات <ChevronLeft size={15}/></Link></aside></section><section className="metric-row"><Metric icon={<TrendingUp/>} label="المعدل العام" value="٩٠٫٢٪" note="↑ تحسن بمقدار ٤٪" tone="mint"/><Metric icon={<ClipboardCheck/>} label="واجبات قريبة" value="٢ واجب" note="أقرب موعد: اليوم" tone="blue"/><Metric icon={<CalendarCheck/>} label="نسبة الحضور" value="٩٦٪" note="٤٨ يوم حضور هذا الفصل" tone="peach"/></section><section className="dashboard-bottom"><div className="panel schedule-panel"><PanelHead title="جدول اليوم" caption="الأربعاء · ١٨ تشرين الثاني" action="عرض التقويم"/>{agenda.map(([time,sub,room],i)=><div className={`schedule-row ${i===1?'current':''}`} key={time}><span className="schedule-time">{time}</span><span className="schedule-line"><i/></span><span className="schedule-subject"><b>{sub}</b><small><MapPin size={12}/>{room}</small></span><span className="schedule-time-end"><Clock3 size={13}/>{i+8}:٤٥</span></div>)}</div><div className="panel grade-panel"><PanelHead title="آخر الدرجات" caption="أحدث تقييماتك" action="كل الدرجات"/>{grades.slice(0,3).map(([sub,exam,score],i)=><div className="grade-row" key={sub}><span className={`subject-dot sd-${i}`}/><span className="grade-sub"><b>{sub}</b><small>{exam}</small></span><b className="grade-score">{score}<small>/١٠٠</small></b></div>)}<div className="notice-strip"><span className="notice-icon"><Bell size={15}/></span><span><b>تذكير: واجب الرياضيات</b><small>موعد التسليم اليوم الساعة ٨:٠٠ م</small></span><ChevronLeft size={15}/></div></div></section></> }
