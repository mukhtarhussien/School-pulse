'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Search, X } from 'lucide-react'

type Contact = { id: string; name: string; photoUrl: string; preview: string }

export function MessagesContactList({ contacts, selectedId }: { contacts: Contact[]; selectedId: string }) {
  const [query, setQuery] = useState('')
  const visible = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase('ar')
    return contacts.filter(contact => `${contact.name} ${contact.preview}`.toLocaleLowerCase('ar').includes(needle))
  }, [contacts, query])

  return <>
    <label className="messages-search">
      <Search size={17} aria-hidden="true" />
      <input value={query} onChange={event => setQuery(event.target.value)} placeholder="ابحث عن محادثة..." aria-label="ابحث عن محادثة" />
      {query && <button type="button" onClick={() => setQuery('')} aria-label="مسح البحث"><X size={15}/></button>}
    </label>
    <nav className="messages-contact-list" aria-label="المحادثات الأخيرة">
      {visible.map(contact => <Link className={`messages-contact${contact.id === selectedId ? ' active' : ''}`} href={`/messages?with=${contact.id}`} key={contact.id} aria-current={contact.id === selectedId ? 'page' : undefined}>
        <span className="messages-contact-avatar">{contact.photoUrl ? <img src={contact.photoUrl} alt=""/> : contact.name.slice(0, 1)}</span>
        <span className="messages-contact-copy"><strong>{contact.name}</strong><small>{contact.preview}</small></span>
      </Link>)}
      {visible.length === 0 && <p className="messages-no-matches">ما لكينا محادثة بهذا الاسم.</p>}
      {contacts.length === 0 && <p className="messages-no-matches">ابدأ محادثة جديدة باختيار شخص من المدرسة.</p>}
    </nav>
  </>
}
