import Link from 'next/link'
import { asc, desc, eq, inArray, or } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'
import { ArrowRight, Ban, Check, CheckCheck, MessageCircle, Search, Send, ShieldCheck, UserRound, UserRoundX, X } from 'lucide-react'
import { redirect } from 'next/navigation'
import { requireDb } from '@/db'
import { messageRequests, users } from '@/db/schema'
import { getCurrentUser } from '@/lib/auth'
import { ChatHistory } from '@/components/chat-history'
import { MessagesContactList } from '@/components/messages-contact-list'
import { respondToMessageRequestAction, sendPrivateMessageAction, toggleBlockedUserAction } from './actions'

export const dynamic = 'force-dynamic'

const resultNotices: Record<string, string> = {
  sent: 'وصلت رسالتك.',
  accepted: 'تم قبول طلب التواصل. تقدرون تتبادلون الرسائل الآن.',
  rejected: 'تم رفض طلب التواصل.',
  invalid: 'تعذر إرسال الرسالة. تحقق من البيانات وحاول مرة ثانية.',
  unavailable: 'هذا الحساب غير متاح للتواصل حاليًا.',
}

function photoUrl(userId: string, key?: string) {
  return key ? `/api/profile-photo/${userId}?v=${encodeURIComponent(key)}` : ''
}

export default async function Messages({ searchParams }: { searchParams: Promise<{ result?: string; with?: string; list?: string; search?: string }> }) {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const db = requireDb()
  const sender = alias(users, 'message_sender')
  const recipient = alias(users, 'message_recipient')
  const blockedIds = Array.isArray(user.preferences?.blockedUserIds) ? user.preferences.blockedUserIds : []
  const [rows, contactRows, params] = await Promise.all([
    db.select({
      id: messageRequests.id,
      senderId: messageRequests.senderId,
      recipientId: messageRequests.recipientId,
      body: messageRequests.body,
      subject: messageRequests.subject,
      status: messageRequests.status,
      createdAt: messageRequests.createdAt,
      senderAr: sender.fullNameAr,
      senderPreferences: sender.preferences,
      recipientAr: recipient.fullNameAr,
      recipientPreferences: recipient.preferences,
    }).from(messageRequests)
      .innerJoin(sender, eq(sender.id, messageRequests.senderId))
      .innerJoin(recipient, eq(recipient.id, messageRequests.recipientId))
      .where(or(eq(messageRequests.recipientId, user.id), eq(messageRequests.senderId, user.id)))
      .orderBy(desc(messageRequests.createdAt)).limit(200),
    db.select({
      id: users.id,
      nameAr: users.fullNameAr,
      username: users.username,
      studentNumber: users.studentNumber,
      role: users.role,
      preferences: users.preferences,
    }).from(users).where(eq(users.isActive, true)).orderBy(asc(users.fullNameAr)),
    searchParams,
  ])

  const unavailableIds = new Set([
    ...blockedIds,
    ...contactRows.filter(contact => contact.preferences?.blockedUserIds?.includes(user.id)).map(contact => contact.id),
  ])
  const contacts = contactRows.filter(contact => contact.id !== user.id && !unavailableIds.has(contact.id))
  const searchTerm = params.search?.trim().toLowerCase() ?? ''
  const matchingContact = searchTerm
    ? contacts.find(contact => contact.username?.toLowerCase() === searchTerm || contact.studentNumber?.toLowerCase() === searchTerm)
    : undefined
  const visibleRows = rows.filter(row => {
    const otherId = row.senderId === user.id ? row.recipientId : row.senderId
    return !unavailableIds.has(otherId)
  })
  const recentByContact = new Map<string, { id: string; name: string; photoUrl: string; preview: string }>()
  for (const row of visibleRows) {
    const otherId = row.senderId === user.id ? row.recipientId : row.senderId
    if (recentByContact.has(otherId)) continue
    const name = row.senderId === user.id ? row.recipientAr : row.senderAr
    const preferences = row.senderId === user.id ? row.recipientPreferences : row.senderPreferences
    recentByContact.set(otherId, { id: otherId, name, photoUrl: photoUrl(otherId, preferences?.profilePhotoKey), preview: row.body })
  }
  const recentChats = [...recentByContact.values()]
  const selectedContact = params.list || searchTerm
    ? undefined
    : contacts.find(contact => contact.id === params.with)
      ?? contacts.find(contact => contact.id === recentChats[0]?.id)
  const selectedId = selectedContact?.id ?? ''
  const threadRows = selectedId
    ? visibleRows.filter(row => row.senderId === selectedId || row.recipientId === selectedId).slice().reverse()
    : []
  const connected = threadRows.some(row => row.status === 'accepted' || row.status === 'read')
  const incomingPending = threadRows.filter(row => row.status === 'pending' && row.recipientId === user.id)
  const waitingOnRecipient = threadRows.some(row => row.status === 'pending' && row.senderId === user.id)
  const rejected = threadRows.some(row => row.status === 'rejected')
  const canCompose = Boolean(selectedContact) && (threadRows.length === 0 || connected)
  const chatCards = recentChats.slice()
  if (selectedContact && !chatCards.some(chat => chat.id === selectedContact.id)) {
    chatCards.unshift({ id: selectedContact.id, name: selectedContact.nameAr, photoUrl: photoUrl(selectedContact.id, selectedContact.preferences?.profilePhotoKey), preview: 'ابدأ محادثة جديدة' })
  }
  const blockedUsers = blockedIds.length
    ? await db.select({ id: users.id, name: users.fullNameAr, email: users.email })
      .from(users).where(inArray(users.id, blockedIds)).orderBy(asc(users.fullNameAr))
    : []
  const resultMessage = params.result ? resultNotices[params.result] : undefined

  return <div className={`messages-page${selectedContact ? ' has-selection' : ''}`}>
    {resultMessage && <p className="message-notice" role="status">{resultMessage}</p>}

    <section className="messages-workspace card" aria-label="المراسلة">
      <aside className="messages-sidebar">
        <header className="messages-sidebar-heading">
          <div><span className="eyebrow">التواصل المدرسي</span><h1>رسائلك</h1><p>محادثاتك الخاصة في مكان واحد</p></div>
          <span className="messages-brand-icon"><MessageCircle size={20}/></span>
        </header>

        <form method="get" action="/messages" className="messages-new-chat">
          <input type="hidden" name="list" value="1"/>
          <label className="sr-only" htmlFor="message-user-search">ابحث باسم المستخدم أو الرقم الطلابي</label>
          <input id="message-user-search" name="search" type="search" dir="ltr" minLength={5} maxLength={60} defaultValue={params.search ?? ''} placeholder="اسم المستخدم أو الرقم الطلابي" required/>
          <button type="submit" aria-label="البحث عن حساب" title="البحث عن حساب"><Search size={18}/></button>
        </form>

        {searchTerm && <section className="messages-search-result" aria-live="polite" aria-label="نتيجة البحث">
          <span className="messages-search-result-label">نتيجة البحث</span>
          {matchingContact ? <Link href={`/messages?with=${matchingContact.id}`} className="messages-search-account">
            <span className="messages-contact-avatar">{matchingContact.preferences?.profilePhotoKey ? <img src={photoUrl(matchingContact.id, matchingContact.preferences.profilePhotoKey)} alt=""/> : matchingContact.nameAr.slice(0, 1)}</span>
            <span><strong>{matchingContact.nameAr}</strong><small>{matchingContact.username ? `@${matchingContact.username}` : 'حساب مرتبط بالرقم الطلابي'} · {matchingContact.role === 'teacher' ? 'مدرس' : matchingContact.role === 'admin' ? 'إدارة' : 'طالب'}</small></span>
            <span className="messages-search-account-action">مراسلة</span>
          </Link> : <p className="messages-search-no-result">ما لقينا حسابًا بهذا الاسم أو الرقم.</p>}
        </section>}

        <div className="messages-list-heading"><span>المحادثات الأخيرة</span><span>{chatCards.length}</span></div>
        <MessagesContactList contacts={chatCards} selectedId={selectedId}/>
        <div className="messages-sidebar-footer"><span className="messages-secure-dot"/> مراسلات المدرسة الخاصة</div>
      </aside>

      <section className="messages-chat-panel" aria-label={selectedContact ? `محادثة مع ${selectedContact.nameAr}` : 'محادثة'}>
        {selectedContact ? <>
          <header className="messages-chat-header">
            <Link className="messages-back-button" href="/messages?list=1" aria-label="العودة للمحادثات"><ArrowRight size={19}/></Link>
            <span className="messages-person-avatar">{selectedContact.preferences?.profilePhotoKey ? <img src={photoUrl(selectedContact.id, selectedContact.preferences.profilePhotoKey)} alt=""/> : selectedContact.nameAr.slice(0, 1)}</span>
            <div className="messages-person-info"><strong>{selectedContact.nameAr}</strong><small>{connected ? 'محادثة خاصة' : 'من حسابات المدرسة'}</small></div>
            <form action={toggleBlockedUserAction} className="chat-block-form"><input type="hidden" name="userId" value={selectedContact.id}/><input type="hidden" name="intent" value="block"/><button className="messages-icon-button" type="submit" aria-label="حظر الحساب" title="حظر الحساب"><Ban size={17}/></button></form>
          </header>

          <div className="messages-chat-body">
            {threadRows.length > 0 && <div className="messages-date-divider"><span>بداية المحادثة</span></div>}
            <ChatHistory threadKey={`${selectedId}:${threadRows.length}:${threadRows[threadRows.length - 1]?.id ?? ''}`}>
              {threadRows.length ? threadRows.map(row => {
                const sentByMe = row.senderId === user.id
                return <article className={`chat-message ${sentByMe ? 'sent' : 'received'}`} key={row.id}>
                  <div className="chat-bubble"><p>{row.body}</p><div className="chat-message-meta"><time dateTime={row.createdAt.toISOString()}>{row.createdAt.toLocaleTimeString('ar-IQ', { hour: '2-digit', minute: '2-digit' })}</time>{sentByMe && row.status === 'pending' && <span>طلب تواصل</span>}{sentByMe && (row.status === 'accepted' || row.status === 'read') && <CheckCheck size={14} aria-label="تم الإرسال"/>}</div></div>
                </article>
              }) : <div className="messages-empty-state"><span><MessageCircle size={24}/></span><h2>بداية حكاية جديدة</h2><p>اكتب أول رسالة إلى {selectedContact.nameAr}.</p></div>}
            </ChatHistory>
          </div>

          {incomingPending.length > 0 && <div className="chat-request-card"><div><strong>طلب تواصل جديد</strong><p>اقبل الطلب حتى تقدرون تتبادلون الرسائل.</p></div>{incomingPending.map(row => <div className="chat-request-actions" key={row.id}>
            <form action={respondToMessageRequestAction}><input type="hidden" name="requestId" value={row.id}/><input type="hidden" name="conversationId" value={selectedContact.id}/><button className="button-primary" name="intent" value="accept" type="submit"><Check size={15}/> قبول</button></form>
            <form action={respondToMessageRequestAction}><input type="hidden" name="requestId" value={row.id}/><input type="hidden" name="conversationId" value={selectedContact.id}/><button className="quiet-danger" name="intent" value="reject" type="submit"><X size={15}/> رفض</button></form>
          </div>)}</div>}
          {!connected && waitingOnRecipient && incomingPending.length === 0 && <p className="chat-system-note">رسالتك وصلت. بانتظار قبول طلب التواصل.</p>}
          {!connected && rejected && <p className="chat-system-note">تم رفض طلب التواصل. ما تقدر ترسل رسائل جديدة لهذا الحساب.</p>}
          {canCompose && <form action={sendPrivateMessageAction} className="chat-composer">
            <input type="hidden" name="recipientId" value={selectedContact.id}/>
            <label className="sr-only" htmlFor="chat-message-input">اكتب رسالة</label>
            <textarea id="chat-message-input" name="body" rows={1} maxLength={3000} required placeholder="اكتب رسالتك هنا..." />
            <button className="chat-send-button" type="submit" aria-label="إرسال الرسالة" title="إرسال الرسالة"><Send size={18}/></button>
          </form>}
        </> : <div className="messages-empty-chat"><span><MessageCircle size={36}/></span><h2>ابدأ محادثتك الأولى</h2><p>اختَر شخصًا من القائمة حتى تبدأ المراسلة.</p><div><Search size={16}/> محادثات المدرسة الخاصة</div></div>}
      </section>
    </section>

    <section className="blocked-panel card">
      <div className="section-header"><div><h2><UserRoundX size={18}/> المستخدمون المحظورون</h2><p>يمكنك إلغاء الحظر في أي وقت.</p></div><span className="count-note">{blockedUsers.length}</span></div>
      {blockedUsers.length ? blockedUsers.map(blocked => <div className="blocked-user-row" key={blocked.id}><span className="message-avatar muted-avatar">{blocked.name.slice(0, 1)}</span><div><strong>{blocked.name}</strong><small>{blocked.email}</small></div><form action={toggleBlockedUserAction}><input type="hidden" name="userId" value={blocked.id}/><input type="hidden" name="intent" value="unblock"/><button className="button-secondary" type="submit"><ShieldCheck size={15}/> إلغاء الحظر</button></form></div>) : <p className="quiet-empty"><UserRound size={18}/> لم تحظر أي مستخدم.</p>}
    </section>
  </div>
}
