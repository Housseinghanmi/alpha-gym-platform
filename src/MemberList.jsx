import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import { useLanguage } from './context/LanguageContext'

const getStatus = (endDate) => {
  const today = new Date()
  const end = new Date(endDate)
  const daysLeft = Math.ceil((end - today) / (1000 * 60 * 60 * 24))
  if (daysLeft < 0) return { label: 'expired', days: daysLeft }
  if (daysLeft <= 7) return { label: 'expiring', days: daysLeft }
  return { label: 'active', days: daysLeft }
}

const StatusBadge = ({ endDate }) => {
  const { t } = useLanguage()
  const { label } = getStatus(endDate)
  const styles = {
    active: 'bg-green-500/10 border border-green-500/30 text-green-400',
    expiring: 'bg-yellow-500/10 border border-yellow-500/30 text-yellow-400',
    expired: 'bg-red-500/10 border border-red-500/30 text-red-400',
  }
  return (
    <span className={`text-xs px-2 py-1 rounded-md font-mono whitespace-nowrap ${styles[label]}`}>
      {t(`status_${label}`)}
    </span>
  )
}

const DISCIPLINES = ['Bodybuilding', 'CrossFit', 'Taekwondo', 'Boxing', 'Yoga', 'Pilates', 'Swimming', 'Cycling', 'MMA', 'Other']

export default function MemberList() {
  const { t } = useLanguage()
  const [members, setMembers] = useState([])
  const [coaches, setCoaches] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingMember, setEditingMember] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')

  const fetchMembers = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()

    const { data: profile } = await supabase
      .from('profiles')
      .select('gym_id')
      .eq('id', user.id)
      .single()

    const [{ data: membersData }, { data: coachesData }] = await Promise.all([
      supabase
        .from('members')
        .select('*, coach:coach_id(id, full_name)')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('profiles')
        .select('id, full_name')
        .eq('role', 'coach')
        .eq('gym_id', profile?.gym_id)
    ])

    setMembers(membersData || [])
    setCoaches(coachesData || [])
    setLoading(false)
  }

  useEffect(() => { fetchMembers() }, [])

  const handleDelete = async (id) => {
    await supabase.from('members').delete().eq('id', id)
    setDeleteConfirm(null)
    fetchMembers()
  }

  const handleSave = async () => {
    setSaving(true)
    await supabase
      .from('members')
      .update({
        full_name: editingMember.full_name,
        phone: editingMember.phone,
        membership_start: editingMember.membership_start,
        membership_end: editingMember.membership_end,
        coach_id: editingMember.coach_id || null,
        discipline: editingMember.discipline,
      })
      .eq('id', editingMember.id)
    setSaving(false)
    setEditingMember(null)
    fetchMembers()
  }

  const filtered = members.filter(m => {
    const matchSearch = m.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      m.phone?.includes(search) ||
      m.discipline?.toLowerCase().includes(search.toLowerCase())
    const matchStatus = filterStatus === 'all' || getStatus(m.membership_end).label === filterStatus
    return matchSearch && matchStatus
  })

  return (
    <div className="space-y-4">

      {/* Search + Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          placeholder={t('members_search')}
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 bg-zinc-900 border border-zinc-800 text-white placeholder-zinc-600 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-orange-500 transition-colors"
        />
        <div className="flex gap-2">
          {['all', 'active', 'expiring', 'expired'].map(s => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                filterStatus === s
                  ? 'bg-orange-500 text-black'
                  : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white'
              }`}
            >
              {t(`status_${s}`)}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-zinc-500 animate-pulse p-4">{t('loading')}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-zinc-800 rounded-xl text-zinc-600 text-sm">
          {t('members_empty')}
        </div>
      ) : (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left text-xs text-zinc-500 uppercase tracking-widest px-4 py-3">{t('col_name')}</th>
                  <th className="text-left text-xs text-zinc-500 uppercase tracking-widest px-4 py-3">{t('col_phone')}</th>
                  <th className="text-left text-xs text-zinc-500 uppercase tracking-widest px-4 py-3">{t('col_discipline')}</th>
                  <th className="text-left text-xs text-zinc-500 uppercase tracking-widest px-4 py-3">{t('col_start')}</th>
                  <th className="text-left text-xs text-zinc-500 uppercase tracking-widest px-4 py-3">{t('col_end')}</th>
                  <th className="text-left text-xs text-zinc-500 uppercase tracking-widest px-4 py-3">{t('col_days')}</th>
                  <th className="text-left text-xs text-zinc-500 uppercase tracking-widest px-4 py-3">{t('col_coach')}</th>
                  <th className="text-left text-xs text-zinc-500 uppercase tracking-widest px-4 py-3">{t('col_status')}</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((member, i) => {
                  const { days } = getStatus(member.membership_end)
                  return (
                    <tr key={member.id} className={`border-b border-zinc-800/50 hover:bg-zinc-800/50 transition-colors ${i % 2 === 0 ? '' : 'bg-zinc-800/20'}`}>
                      <td className="px-4 py-3 text-white text-sm font-medium">{member.full_name}</td>
                      <td className="px-4 py-3 text-zinc-400 text-sm">{member.phone || '—'}</td>
                      <td className="px-4 py-3 text-zinc-400 text-sm">{member.discipline || '—'}</td>
                      <td className="px-4 py-3 text-zinc-400 text-sm">{member.membership_start || '—'}</td>
                      <td className="px-4 py-3 text-zinc-400 text-sm">{member.membership_end || '—'}</td>
                      <td className="px-4 py-3 text-zinc-400 text-sm">
                        {days >= 0 ? `${days}d` : `${Math.abs(days)}d ${t('days_ago')}`}
                      </td>
                      <td className="px-4 py-3 text-zinc-400 text-sm">{member.coach?.full_name || '—'}</td>
                      <td className="px-4 py-3"><StatusBadge endDate={member.membership_end} /></td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button onClick={() => setEditingMember(member)}
                            className="text-xs text-zinc-400 hover:text-orange-400 transition-colors">✏️</button>
                          <button onClick={() => setDeleteConfirm(member.id)}
                            className="text-xs text-zinc-400 hover:text-red-400 transition-colors">🗑️</button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden divide-y divide-zinc-800">
            {filtered.map(member => {
              const { days } = getStatus(member.membership_end)
              return (
                <div key={member.id} className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-white font-medium">{member.full_name}</p>
                    <StatusBadge endDate={member.membership_end} />
                  </div>
                  <p className="text-zinc-500 text-xs">{member.phone} · {member.discipline || '—'}</p>
                  <p className="text-zinc-500 text-xs">{member.membership_start} → {member.membership_end}</p>
                  <p className="text-zinc-500 text-xs">{t('col_coach')}: {member.coach?.full_name || '—'}</p>
                  <p className="text-zinc-500 text-xs">
                    {days >= 0 ? `${days} ${t('days_left')}` : `${Math.abs(days)}d ${t('days_ago')}`}
                  </p>
                  <div className="flex gap-3 pt-1">
                    <button onClick={() => setEditingMember(member)}
                      className="text-xs text-orange-400 hover:text-orange-300">✏️ {t('action_edit')}</button>
                    <button onClick={() => setDeleteConfirm(member.id)}
                      className="text-xs text-red-400 hover:text-red-300">🗑️ {t('action_delete')}</button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingMember && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-md space-y-4">
            <h3 className="text-white font-bold text-lg">{t('edit_member_title')}</h3>

            {[
              { label: t('col_name'), field: 'full_name', type: 'text' },
              { label: t('col_phone'), field: 'phone', type: 'tel' },
              { label: t('col_start'), field: 'membership_start', type: 'date' },
              { label: t('col_end'), field: 'membership_end', type: 'date' },
            ].map(({ label, field, type }) => (
              <div key={field}>
                <label className="text-xs text-zinc-400 uppercase tracking-widest block mb-1.5">{label}</label>
                <input type={type} value={editingMember[field] || ''}
                  onChange={e => setEditingMember(m => ({ ...m, [field]: e.target.value }))}
                  className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-orange-500 transition-colors" />
              </div>
            ))}

            <div>
              <label className="text-xs text-zinc-400 uppercase tracking-widest block mb-1.5">{t('col_discipline')}</label>
              <select value={editingMember.discipline || ''}
                onChange={e => setEditingMember(m => ({ ...m, discipline: e.target.value }))}
                className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-orange-500 transition-colors">
                <option value="">—</option>
                {DISCIPLINES.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>

            <div>
              <label className="text-xs text-zinc-400 uppercase tracking-widest block mb-1.5">{t('col_coach')}</label>
              <select value={editingMember.coach_id || ''}
                onChange={e => setEditingMember(m => ({ ...m, coach_id: e.target.value }))}
                className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-orange-500 transition-colors">
                <option value="">— {t('no_coach')} —</option>
                {coaches.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
              </select>
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={handleSave} disabled={saving}
                className="flex-1 bg-orange-500 hover:bg-orange-400 disabled:opacity-50 text-black font-bold py-2.5 rounded-lg text-sm transition-colors">
                {saving ? t('saving') : t('action_save')}
              </button>
              <button onClick={() => setEditingMember(null)}
                className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white py-2.5 rounded-lg text-sm transition-colors">
                {t('action_cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-sm text-center space-y-4">
            <p className="text-2xl">⚠️</p>
            <p className="text-white font-bold">{t('delete_confirm_title')}</p>
            <p className="text-zinc-500 text-sm">{t('delete_confirm_subtitle')}</p>
            <div className="flex gap-3">
              <button onClick={() => handleDelete(deleteConfirm)}
                className="flex-1 bg-red-500 hover:bg-red-400 text-white font-bold py-2.5 rounded-lg text-sm transition-colors">
                {t('action_delete')}
              </button>
              <button onClick={() => setDeleteConfirm(null)}
                className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white py-2.5 rounded-lg text-sm transition-colors">
                {t('action_cancel')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}