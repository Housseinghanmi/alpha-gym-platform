import React, { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import { useLanguage } from './context/LanguageContext'

const generateTempPassword = () => {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  return Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

const subColor = (type) => ({
  monthly: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  trimester: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
  '6months': 'text-green-400 bg-green-500/10 border-green-500/20',
  yearly: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
}[type] || 'text-gray-400 bg-gray-500/10 border-gray-500/20')

// ── Gym Detail Drawer ──────────────────────────────────────────
function GymDetailDrawer({ owner, onClose }) {
  const [details, setDetails] = useState(null)
  const [loading, setLoading] = useState(true)
  const [openCoach, setOpenCoach] = useState(null)
  const [showStandalone, setShowStandalone] = useState(false)

  useEffect(() => {
    if (!owner?.gym_id) return
    setLoading(true)
    supabase.rpc('get_gym_details', { p_gym_id: owner.gym_id })
      .then(({ data }) => { setDetails(data); setLoading(false) })
  }, [owner?.gym_id])

  const coaches = details?.coaches || []
  const standalone = details?.standalone || []
  const totalMembers = coaches.reduce((s, c) => s + (c.members?.length || 0), 0) + standalone.length

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="w-full max-w-lg bg-white dark:bg-zinc-950 border-l border-gray-200 dark:border-zinc-800 flex flex-col h-full shadow-2xl">

        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-200 dark:border-zinc-800 flex items-start justify-between shrink-0">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 bg-orange-500/10 text-orange-500 rounded-lg flex items-center justify-center font-black text-sm">
                {owner.gym_name?.charAt(0)?.toUpperCase() || '?'}
              </div>
              <h3 className="text-gray-900 dark:text-white font-bold text-base">{owner.gym_name}</h3>
            </div>
            <p className="text-gray-400 dark:text-zinc-500 text-xs">{owner.gym_location || '—'}</p>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span className="text-xs text-gray-500 dark:text-zinc-400">
                👤 <span className="font-medium text-gray-700 dark:text-zinc-200">{owner.full_name || owner.email}</span>
              </span>
              <span className="text-gray-300 dark:text-zinc-700">·</span>
              <span className="text-xs text-gray-400 dark:text-zinc-500">{coaches.length} coaches</span>
              <span className="text-gray-300 dark:text-zinc-700">·</span>
              <span className="text-xs text-gray-400 dark:text-zinc-500">{totalMembers} members</span>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors text-xl leading-none mt-1">✕</button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-3">
          {loading ? (
            <div className="space-y-3 animate-pulse">
              {[...Array(3)].map((_, i) => <div key={i} className="h-14 bg-gray-100 dark:bg-zinc-900 rounded-xl" />)}
            </div>
          ) : coaches.length === 0 && standalone.length === 0 ? (
            <div className="text-center py-16 text-gray-400 dark:text-zinc-600 text-sm">No coaches or members yet</div>
          ) : (
            <>
              {coaches.map(coach => (
                <div key={coach.id} className="bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl overflow-hidden">
                  <button
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
                    onClick={() => setOpenCoach(openCoach === coach.id ? null : coach.id)}>
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 bg-orange-500/15 text-orange-500 rounded-lg flex items-center justify-center text-xs font-black shrink-0">
                        {coach.full_name?.charAt(0)?.toUpperCase()}
                      </div>
                      <div className="text-left min-w-0">
                        <p className="text-gray-900 dark:text-white text-sm font-semibold truncate">{coach.full_name}</p>
                        <p className="text-gray-400 dark:text-zinc-500 text-xs">{coach.phone || '—'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {coach.first_login && (
                        <span className="text-[10px] bg-yellow-500/10 border border-yellow-500/30 text-yellow-500 px-2 py-0.5 rounded-full">pending</span>
                      )}
                      <span className="text-xs bg-orange-500/10 border border-orange-500/20 text-orange-400 px-2 py-0.5 rounded-full font-medium">
                        {coach.members?.length || 0} members
                      </span>
                      <span className={`text-gray-400 transition-transform duration-200 inline-block ${openCoach === coach.id ? 'rotate-180' : ''}`}>▾</span>
                    </div>
                  </button>

                  {openCoach === coach.id && (
                    <div className="border-t border-gray-200 dark:border-zinc-800">
                      {!coach.members?.length ? (
                        <p className="text-center text-xs text-gray-400 dark:text-zinc-600 py-4">No members assigned</p>
                      ) : (() => {
                        const byDiscipline = coach.members.reduce((acc, m) => {
                          if (!acc[m.discipline]) acc[m.discipline] = []
                          acc[m.discipline].push(m)
                          return acc
                        }, {})
                        return Object.entries(byDiscipline).map(([discipline, members]) => (
                          <div key={discipline}>
                            <div className="px-4 py-1.5 bg-gray-100 dark:bg-zinc-800/60">
                              <span className="text-[10px] uppercase tracking-widest text-gray-400 dark:text-zinc-500 font-semibold">{discipline}</span>
                            </div>
                            {members.map(member => (
                              <div key={member.membership_id} className="flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-zinc-800/30">
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <div className="w-6 h-6 bg-zinc-200 dark:bg-zinc-700 rounded-full flex items-center justify-center text-[10px] font-bold text-gray-600 dark:text-zinc-300 shrink-0">
                                    {member.full_name?.charAt(0)?.toUpperCase()}
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-gray-800 dark:text-zinc-200 text-xs font-medium truncate">{member.full_name}</p>
                                    <p className="text-gray-400 dark:text-zinc-600 text-[10px]">{member.phone || '—'}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <span className={`text-[10px] border px-1.5 py-0.5 rounded-full font-medium ${subColor(member.subscription_type)}`}>
                                    {member.subscription_type}
                                  </span>
                                  <span className="text-[10px] text-gray-400 dark:text-zinc-500 font-mono">{member.price_paid} DT</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        ))
                      })()}
                    </div>
                  )}
                </div>
              ))}

              {/* Standalone */}
              {standalone.length > 0 && (
                <div className="bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl overflow-hidden">
                  <button
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
                    onClick={() => setShowStandalone(v => !v)}>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-zinc-200 dark:bg-zinc-700 text-gray-500 dark:text-zinc-400 rounded-lg flex items-center justify-center text-xs font-black shrink-0">✦</div>
                      <div className="text-left">
                        <p className="text-gray-900 dark:text-white text-sm font-semibold">Standalone Members</p>
                        <p className="text-gray-400 dark:text-zinc-500 text-xs">No coach assigned</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs bg-zinc-200 dark:bg-zinc-700 text-gray-600 dark:text-zinc-300 px-2 py-0.5 rounded-full font-medium">{standalone.length} members</span>
                      <span className={`text-gray-400 transition-transform duration-200 inline-block ${showStandalone ? 'rotate-180' : ''}`}>▾</span>
                    </div>
                  </button>
                  {showStandalone && (
                    <div className="border-t border-gray-200 dark:border-zinc-800 divide-y divide-gray-200 dark:divide-zinc-800">
                      {standalone.map(member => (
                        <div key={member.membership_id} className="flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-zinc-800/30">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-6 h-6 bg-zinc-200 dark:bg-zinc-700 rounded-full flex items-center justify-center text-[10px] font-bold text-gray-600 dark:text-zinc-300 shrink-0">
                              {member.full_name?.charAt(0)?.toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="text-gray-800 dark:text-zinc-200 text-xs font-medium truncate">{member.full_name}</p>
                              <p className="text-gray-400 dark:text-zinc-600 text-[10px]">{member.phone || '—'} · {member.discipline}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className={`text-[10px] border px-1.5 py-0.5 rounded-full font-medium ${subColor(member.subscription_type)}`}>
                              {member.subscription_type}
                            </span>
                            <span className="text-[10px] text-gray-400 dark:text-zinc-500 font-mono">{member.price_paid} DT</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main AdminPanel ────────────────────────────────────────────
export default function AdminPanel() {
  const { t } = useLanguage()
  const [owners, setOwners] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ email: '', phone: '', gymName: '', location: '' })
  const [creating, setCreating] = useState(false)
  const [createdCreds, setCreatedCreds] = useState(null)
  const [message, setMessage] = useState(null)
  const [selectedOwner, setSelectedOwner] = useState(null)

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }))

  const fetchOwners = async () => {
    setLoading(true)
    const { data } = await supabase.rpc('get_all_owners')
    setOwners(data || [])
    setLoading(false)
  }

  useEffect(() => { fetchOwners() }, [])

  const handleCreate = async (e) => {
    e.preventDefault()
    setCreating(true)
    setMessage(null)
    const tempPassword = generateTempPassword()
    try {
      const { data: { session: adminSession } } = await supabase.auth.getSession()
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({ email: form.email, password: tempPassword })
      if (signUpError) throw signUpError
      const newUserId = signUpData.user.id
      await supabase.auth.setSession({ access_token: adminSession.access_token, refresh_token: adminSession.refresh_token })
      const { error: profileError } = await supabase.rpc('create_user_profile', {
        p_id: newUserId, p_full_name: '', p_phone: form.phone, p_role: 'owner', p_gym_id: null, p_temp_password: tempPassword,
      })
      if (profileError) throw profileError
      const { data: gymData, error: gymError } = await supabase
        .from('gyms').insert([{ name: form.gymName, location: form.location, owner_id: newUserId }]).select().single()
      if (gymError) throw gymError
      await supabase.from('profiles').update({ gym_id: gymData.id }).eq('id', newUserId)
      setCreatedCreds({ email: form.email, password: tempPassword })
      setForm({ email: '', phone: '', gymName: '', location: '' })
      setShowModal(false)
      fetchOwners()
    } catch (err) {
      setMessage({ type: 'error', text: err.message })
    }
    setCreating(false)
  }

  const inputClass = "w-full bg-gray-100 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-zinc-600 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-500 transition-colors"
  const labelClass = "text-xs text-gray-500 dark:text-zinc-400 uppercase tracking-widest block mb-1.5"

  return (
    <div className="max-w-4xl space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-gray-900 dark:text-white font-bold text-lg">{t('admin_owners_title')}</h2>
          <p className="text-gray-400 dark:text-zinc-500 text-sm mt-0.5">{owners.length} {t('admin_owner_badge').toLowerCase()}s</p>
        </div>
        <button onClick={() => { setShowModal(true); setMessage(null) }}
          className="bg-orange-500 hover:bg-orange-400 text-black font-bold px-5 py-2.5 rounded-xl text-sm transition-colors">
          + {t('admin_create_button')}
        </button>
      </div>

      {/* Credentials Card */}
      {createdCreds && (
        <div className="bg-orange-500/10 border border-orange-500/30 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3"><span>🔑</span><h3 className="text-orange-500 font-bold text-sm">{t('admin_creds_title')}</h3></div>
          <p className="text-gray-500 dark:text-zinc-400 text-sm mb-4">{t('admin_creds_subtitle')}</p>
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
          <button onClick={() => setCreatedCreds(null)} className="mt-3 text-xs text-gray-400 dark:text-zinc-500 hover:text-gray-900 dark:hover:text-white underline transition-colors">
            {t('admin_creds_dismiss')}
          </button>
        </div>
      )}

      {/* Owners List */}
      {loading ? (
        <div className="space-y-3 animate-pulse">
          {[...Array(3)].map((_, i) => <div key={i} className="h-20 bg-gray-100 dark:bg-zinc-900 rounded-2xl" />)}
        </div>
      ) : owners.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-zinc-900/50 rounded-2xl border-2 border-dashed border-gray-200 dark:border-zinc-800 text-gray-400 dark:text-zinc-500 text-sm">
          {t('admin_no_owners')}
        </div>
      ) : (
        <div className="space-y-3">
          {owners.map(owner => (
            <div key={owner.id} onClick={() => setSelectedOwner(owner)}
              className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl px-5 py-4 flex items-center justify-between gap-4 hover:border-orange-500/40 cursor-pointer transition-colors group">
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-10 h-10 bg-orange-500/10 text-orange-500 rounded-xl flex items-center justify-center font-black shrink-0">
                  {owner.gym_name?.charAt(0)?.toUpperCase() || '?'}
                </div>
                <div className="min-w-0">
                  <p className="text-gray-900 dark:text-white font-bold truncate">{owner.gym_name || t('admin_no_gym')}</p>
                  <p className="text-gray-400 dark:text-zinc-500 text-xs mt-0.5">
                    {owner.gym_location || t('admin_no_location')} · {owner.full_name || owner.email}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {owner.first_login && (
                  <span className="text-[10px] bg-yellow-500/10 border border-yellow-500/30 text-yellow-500 px-2 py-0.5 rounded-full font-mono">
                    {t('admin_awaiting_login')}
                  </span>
                )}
                <span className="text-[10px] bg-orange-500/10 border border-orange-500/30 text-orange-500 px-2 py-0.5 rounded-full font-mono uppercase">
                  {t('admin_owner_badge')}
                </span>
                <span className="text-gray-300 dark:text-zinc-600 group-hover:text-orange-500 transition-colors">›</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Gym Detail Drawer */}
      {selectedOwner && <GymDetailDrawer owner={selectedOwner} onClose={() => setSelectedOwner(null)} />}

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl p-6 w-full max-w-md space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-gray-900 dark:text-white font-bold text-lg">{t('admin_create_title')}</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors text-lg">✕</button>
            </div>
            <p className="text-gray-500 dark:text-zinc-500 text-sm">{t('admin_create_subtitle')}</p>
            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className={labelClass}>{t('admin_owner_email')}</label>
                <input type="email" placeholder="owner@example.com" value={form.email} onChange={set('email')} required className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>{t('admin_phone')}</label>
                <input type="tel" placeholder="+216 00 000 000" value={form.phone} onChange={set('phone')} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>{t('admin_gym_name')}</label>
                <input type="text" placeholder={t('admin_gym_name_placeholder')} value={form.gymName} onChange={set('gymName')} required className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>{t('admin_location')}</label>
                <input type="text" placeholder={t('admin_location_placeholder')} value={form.location} onChange={set('location')} className={inputClass} />
              </div>
              {message && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl px-4 py-3 text-sm">{message.text}</div>
              )}
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={creating}
                  className="flex-1 bg-orange-500 hover:bg-orange-400 disabled:opacity-50 text-black font-bold py-3 rounded-xl text-sm transition-colors">
                  {creating ? t('admin_creating') : t('admin_create_button')}
                </button>
                <button type="button" onClick={() => setShowModal(false)}
                  className="flex-1 bg-gray-200 dark:bg-zinc-800 hover:bg-gray-300 dark:hover:bg-zinc-700 text-gray-700 dark:text-white py-3 rounded-xl text-sm transition-colors">
                  {t('action_cancel')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}