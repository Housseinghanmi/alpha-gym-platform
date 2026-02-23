import { useState, useEffect, useMemo } from 'react'
import { supabase } from './supabaseClient'
import { useLanguage } from './context/LanguageContext'

const generateTempPassword = () => {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  return Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

const getStatus = (endDate) => {
  if (!endDate) return { label: 'expired', days: 0 }
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const end = new Date(endDate); end.setHours(0, 0, 0, 0)
  const daysLeft = Math.ceil((end - today) / (1000 * 60 * 60 * 24))
  if (daysLeft < 0) return { label: 'expired', days: daysLeft }
  if (daysLeft <= 7) return { label: 'expiring', days: daysLeft }
  return { label: 'active', days: daysLeft }
}

const StatusBadge = ({ endDate }) => {
  const { t } = useLanguage()
  const { label } = getStatus(endDate)
  const styles = {
    active: 'bg-green-500/10 border border-green-500/30 text-green-500',
    expiring: 'bg-yellow-500/10 border border-yellow-500/30 text-yellow-500',
    expired: 'bg-red-500/10 border border-red-500/30 text-red-400',
  }
  return (
    <span className={`text-[10px] uppercase px-2 py-0.5 rounded-full font-bold border ${styles[label]}`}>
      {t(`status_${label}`)}
    </span>
  )
}

const DISCIPLINES = ['Bodybuilding', 'CrossFit', 'Taekwondo', 'Boxing', 'Yoga', 'Pilates', 'Swimming', 'Cycling', 'MMA', 'Kickboxing', 'Other']
const SUB_TYPES = ['monthly', 'trimester', '6months', 'yearly']
const SUB_MULTIPLIERS = { monthly: 1, trimester: 3, '6months': 6, yearly: 12 }

const subTypeColors = {
  monthly: 'bg-blue-500/10 border-blue-500/30 text-blue-400',
  trimester: 'bg-purple-500/10 border-purple-500/30 text-purple-400',
  '6months': 'bg-orange-500/10 border-orange-500/30 text-orange-400',
  yearly: 'bg-green-500/10 border-green-500/30 text-green-500',
}

const calculateEndDate = (subType) => {
  const date = new Date()
  date.setMonth(date.getMonth() + (SUB_MULTIPLIERS[subType] || 1))
  return date.toISOString().split('T')[0]
}

const calculateFinalPrice = (basePrice, promoPercent) => {
  const base = parseFloat(basePrice) || 0
  const promo = parseFloat(promoPercent) || 0
  return base - (base * promo / 100)
}

const PasswordReveal = ({ password }) => {
  const [visible, setVisible] = useState(false)
  return (
    <div className="flex items-center gap-1 flex-wrap">
      <span className="text-[10px] bg-yellow-500/10 border border-yellow-500/30 text-yellow-500 px-2 py-0.5 rounded-full font-mono">
        {visible ? password : '••••••••••'}
      </span>
      <button
        onClick={() => setVisible(v => !v)}
        className="text-[10px] text-gray-400 dark:text-zinc-500 hover:text-orange-500 transition-colors underline">
        {visible ? 'hide' : '🔑'}
      </button>
    </div>
  )
}

export default function MemberList() {
  const { t } = useLanguage()
  const [memberships, setMemberships] = useState([])
  const [coaches, setCoaches] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingMembership, setEditingMembership] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [createdCreds, setCreatedCreds] = useState(null)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [gymId, setGymId] = useState(null)
  const [addMessage, setAddMessage] = useState(null)

  const today = new Date().toISOString().split('T')[0]
  const defaultForm = { email: '', fullName: '', phone: '', discipline: '', subType: 'monthly', basePrice: '', promoPercent: '0', coachId: '' }
  const [addForm, setAddForm] = useState(defaultForm)

  const computedEndDate = calculateEndDate(addForm.subType)
  const finalPrice = calculateFinalPrice(addForm.basePrice, addForm.promoPercent)

  const fetchData = async () => {
    setLoading(true)
    const { data: profile } = await supabase.rpc('get_my_profile')
    setGymId(profile?.gym_id)
    const [{ data: m }, { data: c }] = await Promise.all([
      supabase.rpc('get_gym_memberships'),
      supabase.rpc('get_gym_coaches'),
    ])
    setMemberships(m || [])
    setCoaches(c || [])
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  const handleAddMember = async (e) => {
    e.preventDefault()
    setSaving(true)
    setAddMessage(null)
    const tempPassword = generateTempPassword()
    try {
      const { data: { session: ownerSession } } = await supabase.auth.getSession()
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({ email: addForm.email, password: tempPassword })
      if (signUpError) throw signUpError
      const newUserId = signUpData.user.id

      await supabase.auth.setSession({ access_token: ownerSession.access_token, refresh_token: ownerSession.refresh_token })

      const { error: profileError } = await supabase.rpc('create_user_profile', {
        p_id: newUserId, p_full_name: addForm.fullName,
        p_phone: addForm.phone || '', p_role: 'member', p_gym_id: gymId,
        p_temp_password: tempPassword,
      })
      if (profileError) throw profileError

      const { error: membershipError } = await supabase.rpc('add_gym_membership', {
        p_member_id: newUserId, p_gym_id: gymId,
        p_discipline: addForm.discipline || '',
        p_membership_start: today,
        p_membership_end: computedEndDate,
        p_subscription_type: addForm.subType,
        p_price_paid: finalPrice,
        p_promo_percentage: parseFloat(addForm.promoPercent) || 0,
        p_coach_id: addForm.coachId || null,
      })
      if (membershipError) throw membershipError

      setCreatedCreds({ email: addForm.email, password: tempPassword })
      setAddForm(defaultForm)
      setShowAddModal(false)
      fetchData()
    } catch (err) {
      setAddMessage({ type: 'error', text: err.message })
    }
    setSaving(false)
  }

  const handleSave = async () => {
    setSaving(true)
    const { error } = await supabase.rpc('update_gym_membership', {
      p_id: editingMembership.id,
      p_discipline: editingMembership.discipline || '',
      p_membership_start: editingMembership.membership_start,
      p_membership_end: editingMembership.membership_end,
      p_subscription_type: editingMembership.subscription_type || 'monthly',
      p_price_paid: parseFloat(editingMembership.price_paid) || 0,
      p_promo_percentage: parseFloat(editingMembership.promo_percentage) || 0,
      p_coach_id: editingMembership.coach_id || null,
    })
    if (!error) { setEditingMembership(null); fetchData() }
    setSaving(false)
  }

  const handleDelete = async (id) => {
    await supabase.rpc('delete_gym_membership', { p_id: id })
    setDeleteConfirm(null)
    fetchData()
  }

  const filtered = useMemo(() => (memberships || []).filter(m => {
    const matchSearch = m.member_name?.toLowerCase().includes(search.toLowerCase()) ||
      m.member_phone?.includes(search) || m.discipline?.toLowerCase().includes(search.toLowerCase())
    const matchStatus = filterStatus === 'all' || getStatus(m.membership_end).label === filterStatus
    return matchSearch && matchStatus
  }), [memberships, search, filterStatus])

  const inputClass = "w-full bg-gray-100 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-zinc-600 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-orange-500 transition-colors"
  const labelClass = "text-xs text-gray-500 dark:text-zinc-400 uppercase tracking-widest block mb-1"

  return (
    <div className="space-y-5">

      {/* Credentials card */}
      {createdCreds && (
        <div className="bg-orange-500/10 border border-orange-500/30 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3"><span>🔑</span><h3 className="text-orange-500 font-bold text-sm">{t('admin_creds_title')}</h3></div>
          <div className="space-y-2">
            <div className="bg-white dark:bg-zinc-900 rounded-xl px-4 py-3 flex justify-between items-center">
              <span className="text-xs text-gray-400 dark:text-zinc-500 uppercase tracking-widest">Email</span>
              <span className="text-gray-900 dark:text-white font-mono text-sm">{createdCreds.email}</span>
            </div>
            <div className="bg-white dark:bg-zinc-900 rounded-xl px-4 py-3 flex justify-between items-center">
              <span className="text-xs text-gray-400 dark:text-zinc-500 uppercase tracking-widest">{t('admin_temp_password')}</span>
              <span className="text-orange-500 font-mono text-sm font-bold tracking-widest">{createdCreds.password}</span>
            </div>
          </div>
          <button onClick={() => setCreatedCreds(null)} className="mt-3 text-xs text-gray-400 underline hover:text-gray-900 dark:hover:text-white transition-colors">{t('admin_creds_dismiss')}</button>
        </div>
      )}

      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-gray-900 dark:text-white font-bold text-lg">{t('view_all_members')}</h2>
          <p className="text-gray-400 dark:text-zinc-500 text-sm">{memberships.length} {t('kpi_total_members').toLowerCase()}</p>
        </div>
        <button onClick={() => { setShowAddModal(true); setAddMessage(null) }}
          className="bg-orange-500 hover:bg-orange-400 text-black font-bold px-5 py-2.5 rounded-xl text-sm transition-colors">
          + {t('nav_add_member')}
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-3">
        <input type="text" placeholder={t('members_search')} value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-zinc-600 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-orange-500 transition-colors" />
        <div className="flex bg-gray-100 dark:bg-zinc-900 p-1 rounded-xl border border-gray-200 dark:border-zinc-800 gap-1">
          {['all', 'active', 'expiring', 'expired'].map(s => (
            <button key={s} onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 rounded-lg text-[10px] uppercase font-bold transition-all ${filterStatus === s ? 'bg-orange-500 text-black' : 'text-gray-500 dark:text-zinc-500 hover:text-gray-900 dark:hover:text-white'}`}>
              {t(`status_${s}`)}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="text-center py-10 text-gray-400 dark:text-zinc-600 animate-pulse">{t('loading')}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-zinc-900/50 rounded-2xl border-2 border-dashed border-gray-200 dark:border-zinc-800 text-gray-400 dark:text-zinc-500 text-sm">
          {t('members_empty')}
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-gray-50 dark:bg-zinc-950 text-gray-400 dark:text-zinc-500 text-[10px] uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-4">{t('col_name')}</th>
                  <th className="px-5 py-4">{t('col_discipline')}</th>
                  <th className="px-5 py-4">{t('col_subscription')}</th>
                  <th className="px-5 py-4">{t('col_price')}</th>
                  <th className="px-5 py-4">{t('col_end')}</th>
                  <th className="px-5 py-4">{t('col_coach')}</th>
                  <th className="px-5 py-4">{t('col_status')}</th>
                  <th className="px-5 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-zinc-800 text-sm">
                {filtered.map(m => {
                  const { days } = getStatus(m.membership_end)
                  return (
                    <tr key={m.id} className="hover:bg-gray-50 dark:hover:bg-zinc-800/40 transition-colors">
                      <td className="px-5 py-4">
                        <p className="font-medium text-gray-900 dark:text-white">{m.member_name}</p>
                        <p className="text-[10px] text-gray-400 dark:text-zinc-500 mt-0.5">{m.member_phone || '—'}</p>
                        {m.first_login && m.temp_password && <PasswordReveal password={m.temp_password} />}
                      </td>
                      <td className="px-5 py-4 text-gray-500 dark:text-zinc-400">{m.discipline || '—'}</td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1 flex-wrap">
                          {m.subscription_type && (
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${subTypeColors[m.subscription_type]}`}>
                              {t(`sub_${m.subscription_type}`)}
                            </span>
                          )}
                          {m.promo_percentage > 0 && (
                            <span className="text-[10px] bg-pink-500/10 border border-pink-500/30 text-pink-400 px-2 py-0.5 rounded-full font-bold">
                              -{m.promo_percentage}%
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-gray-900 dark:text-white font-medium">
                        {m.price_paid > 0 ? `${m.price_paid} DT` : '—'}
                      </td>
                      <td className="px-5 py-4">
                        <p className="text-gray-500 dark:text-zinc-400">{m.membership_end}</p>
                        <p className="text-[10px] text-gray-400 dark:text-zinc-600 mt-0.5">
                          {days >= 0 ? `${days} ${t('days_left')}` : `${Math.abs(days)}d ${t('days_ago')}`}
                        </p>
                      </td>
                      <td className="px-5 py-4 text-gray-500 dark:text-zinc-400">{m.coach_name || '—'}</td>
                      <td className="px-5 py-4"><StatusBadge endDate={m.membership_end} /></td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button onClick={() => setEditingMembership(m)} className="text-gray-400 hover:text-orange-500 transition-colors">✏️</button>
                          <button onClick={() => setDeleteConfirm(m.id)} className="text-gray-400 hover:text-red-500 transition-colors">🗑️</button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-3">
            {filtered.map(m => {
              const { days } = getStatus(m.membership_end)
              return (
                <div key={m.id} className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-gray-900 dark:text-white">{m.member_name}</p>
                    <StatusBadge endDate={m.membership_end} />
                  </div>
                  <p className="text-gray-400 dark:text-zinc-500 text-xs">{m.member_phone || '—'} · {m.discipline || '—'}</p>
                  {m.first_login && m.temp_password && <PasswordReveal password={m.temp_password} />}
                  <div className="flex items-center gap-2 flex-wrap">
                    {m.subscription_type && <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${subTypeColors[m.subscription_type]}`}>{t(`sub_${m.subscription_type}`)}</span>}
                    {m.price_paid > 0 && <span className="text-xs text-gray-900 dark:text-white font-bold">{m.price_paid} DT</span>}
                    {m.promo_percentage > 0 && <span className="text-[10px] bg-pink-500/10 border border-pink-500/30 text-pink-400 px-2 py-0.5 rounded-full font-bold">-{m.promo_percentage}%</span>}
                  </div>
                  <p className="text-gray-400 dark:text-zinc-500 text-xs">{m.membership_end} · {days >= 0 ? `${days} ${t('days_left')}` : `${Math.abs(days)}d ${t('days_ago')}`}</p>
                  <p className="text-gray-400 dark:text-zinc-500 text-xs">{t('col_coach')}: {m.coach_name || '—'}</p>
                  <div className="flex gap-3 pt-1">
                    <button onClick={() => setEditingMembership(m)} className="text-xs text-orange-500">✏️ {t('action_edit')}</button>
                    <button onClick={() => setDeleteConfirm(m.id)} className="text-xs text-red-400">🗑️ {t('action_delete')}</button>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* ── ADD MEMBER MODAL ── */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl p-6 w-full max-w-lg space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-gray-900 dark:text-white font-bold text-lg">{t('add_member_title')}</h3>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors text-lg">✕</button>
            </div>

            <form onSubmit={handleAddMember} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className={labelClass}>{t('col_name')}</label>
                  <input type="text" placeholder="John Doe" value={addForm.fullName} required className={inputClass}
                    onChange={e => setAddForm(f => ({ ...f, fullName: e.target.value }))} />
                </div>
                <div className="col-span-2">
                  <label className={labelClass}>Email</label>
                  <input type="email" placeholder="member@example.com" value={addForm.email} required className={inputClass}
                    onChange={e => setAddForm(f => ({ ...f, email: e.target.value }))} />
                </div>
                <div>
                  <label className={labelClass}>{t('col_phone')}</label>
                  <input type="tel" placeholder="+216 00 000 000" value={addForm.phone} className={inputClass}
                    onChange={e => setAddForm(f => ({ ...f, phone: e.target.value }))} />
                </div>
                <div>
                  <label className={labelClass}>{t('col_discipline')}</label>
                  <select value={addForm.discipline} className={inputClass}
                    onChange={e => setAddForm(f => ({ ...f, discipline: e.target.value }))}>
                    <option value="">— {t('select_discipline')} —</option>
                    {DISCIPLINES.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className={labelClass}>{t('col_coach')}</label>
                <select value={addForm.coachId} className={inputClass}
                  onChange={e => setAddForm(f => ({ ...f, coachId: e.target.value }))}>
                  <option value="">— {t('no_coach')} —</option>
                  {coaches.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
                </select>
              </div>

              {/* Subscription */}
              <div className="border-t border-gray-100 dark:border-zinc-800 pt-3">
                <p className="text-xs text-gray-500 dark:text-zinc-400 uppercase tracking-widest font-bold mb-3">{t('subscription_section')}</p>
                <div className="grid grid-cols-4 gap-2 mb-3">
                  {SUB_TYPES.map(type => (
                    <button key={type} type="button"
                      onClick={() => setAddForm(f => ({ ...f, subType: type }))}
                      className={`py-2 rounded-xl text-xs font-bold border transition-all ${addForm.subType === type ? 'bg-orange-500 text-black border-orange-500' : 'bg-gray-100 dark:bg-zinc-800 border-gray-200 dark:border-zinc-700 text-gray-500 dark:text-zinc-400 hover:border-orange-500'}`}>
                      {t(`sub_${type}`)}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>{t('col_price')} (DT)</label>
                    <input type="number" min="0" step="0.5" placeholder="0.00" value={addForm.basePrice} className={inputClass}
                      onChange={e => setAddForm(f => ({ ...f, basePrice: e.target.value }))} />
                  </div>
                  <div>
                    <label className={labelClass}>{t('col_promo')} (%)</label>
                    <input type="number" min="0" max="100" step="1" placeholder="0" value={addForm.promoPercent} className={inputClass}
                      onChange={e => setAddForm(f => ({ ...f, promoPercent: e.target.value }))} />
                  </div>
                </div>

                <div className="mt-3 bg-gray-50 dark:bg-zinc-800 rounded-xl px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] text-gray-400 dark:text-zinc-500 uppercase tracking-widest">{t('price_preview')}</p>
                    <p className="text-gray-900 dark:text-white font-black text-lg mt-0.5">
                      {addForm.basePrice ? `${finalPrice.toFixed(2)} DT` : '—'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-gray-400 dark:text-zinc-500 uppercase tracking-widest">{t('membership_end')}</p>
                    <p className="text-gray-900 dark:text-white font-medium text-sm mt-0.5">{computedEndDate}</p>
                  </div>
                </div>
              </div>

              {addMessage && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl px-4 py-3 text-sm">
                  {addMessage.text}
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <button type="submit" disabled={saving}
                  className="flex-1 bg-orange-500 hover:bg-orange-400 disabled:opacity-50 text-black font-bold py-3 rounded-xl text-sm transition-colors">
                  {saving ? t('add_loading') : t('add_button')}
                </button>
                <button type="button" onClick={() => setShowAddModal(false)}
                  className="flex-1 bg-gray-200 dark:bg-zinc-800 text-gray-700 dark:text-white py-3 rounded-xl text-sm transition-colors">
                  {t('action_cancel')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingMembership && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl p-6 w-full max-w-md space-y-3 max-h-[90vh] overflow-y-auto">
            <h3 className="text-gray-900 dark:text-white font-bold text-lg">{t('edit_member_title')}</h3>

            <div>
              <label className={labelClass}>{t('col_discipline')}</label>
              <select value={editingMembership.discipline || ''} className={inputClass}
                onChange={e => setEditingMembership(m => ({ ...m, discipline: e.target.value }))}>
                <option value="">— {t('select_discipline')} —</option>
                {DISCIPLINES.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>

            <div>
              <label className={labelClass}>{t('col_coach')}</label>
              <select value={editingMembership.coach_id || ''} className={inputClass}
                onChange={e => setEditingMembership(m => ({ ...m, coach_id: e.target.value }))}>
                <option value="">— {t('no_coach')} —</option>
                {coaches.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {SUB_TYPES.map(type => (
                <button key={type} type="button"
                  onClick={() => setEditingMembership(m => ({ ...m, subscription_type: type }))}
                  className={`py-2 rounded-xl text-xs font-bold border transition-all ${editingMembership.subscription_type === type ? 'bg-orange-500 text-black border-orange-500' : 'bg-gray-100 dark:bg-zinc-800 border-gray-200 dark:border-zinc-700 text-gray-500 dark:text-zinc-400'}`}>
                  {t(`sub_${type}`)}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>{t('col_price')} (DT)</label>
                <input type="number" min="0" step="0.5" value={editingMembership.price_paid || ''} className={inputClass}
                  onChange={e => setEditingMembership(m => ({ ...m, price_paid: e.target.value }))} />
              </div>
              <div>
                <label className={labelClass}>{t('col_promo')} (%)</label>
                <input type="number" min="0" max="100" value={editingMembership.promo_percentage || 0} className={inputClass}
                  onChange={e => setEditingMembership(m => ({ ...m, promo_percentage: e.target.value }))} />
              </div>
              <div>
                <label className={labelClass}>{t('col_start')}</label>
                <input type="date" value={editingMembership.membership_start || ''} className={inputClass}
                  onChange={e => setEditingMembership(m => ({ ...m, membership_start: e.target.value }))} />
              </div>
              <div>
                <label className={labelClass}>{t('col_end')}</label>
                <input type="date" value={editingMembership.membership_end || ''} className={inputClass}
                  onChange={e => setEditingMembership(m => ({ ...m, membership_end: e.target.value }))} />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={handleSave} disabled={saving}
                className="flex-1 bg-orange-500 hover:bg-orange-400 disabled:opacity-50 text-black font-bold py-2.5 rounded-xl text-sm transition-colors">
                {saving ? t('saving') : t('action_save')}
              </button>
              <button onClick={() => setEditingMembership(null)}
                className="flex-1 bg-gray-200 dark:bg-zinc-800 text-gray-700 dark:text-white py-2.5 rounded-xl text-sm transition-colors">
                {t('action_cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl p-6 w-full max-w-sm text-center space-y-4">
            <div className="w-14 h-14 bg-red-500/10 rounded-full flex items-center justify-center mx-auto text-2xl">⚠️</div>
            <p className="text-gray-900 dark:text-white font-bold">{t('delete_confirm_title')}</p>
            <p className="text-gray-500 dark:text-zinc-500 text-sm">{t('delete_confirm_subtitle')}</p>
            <div className="flex gap-3">
              <button onClick={() => handleDelete(deleteConfirm)}
                className="flex-1 bg-red-500 hover:bg-red-400 text-white font-bold py-2.5 rounded-xl text-sm transition-colors">
                {t('action_delete')}
              </button>
              <button onClick={() => setDeleteConfirm(null)}
                className="flex-1 bg-gray-200 dark:bg-zinc-800 text-gray-700 dark:text-white py-2.5 rounded-xl text-sm transition-colors">
                {t('action_cancel')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}