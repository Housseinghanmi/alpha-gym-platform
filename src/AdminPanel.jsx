import React, { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import { useLanguage } from './context/LanguageContext'

const generateTempPassword = () => {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  return Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

const OwnerPasswordReveal = ({ password }) => {
  const [visible, setVisible] = React.useState(false)
  return (
    <div className="flex items-center gap-1">
      <span className="text-[10px] bg-yellow-500/10 border border-yellow-500/30 text-yellow-500 px-2 py-0.5 rounded-full font-mono">
        {visible ? password : '••••••••••'}
      </span>
      <button
        onClick={() => setVisible(v => !v)}
        className="text-[10px] text-gray-400 hover:text-orange-500 transition-colors underline">
        {visible ? 'hide' : '🔑'}
      </button>
    </div>
  )
}

export default function AdminPanel() {
  const { t } = useLanguage()
  const [owners, setOwners] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ email: '', phone: '', gymName: '', location: '' })
  const [creating, setCreating] = useState(false)
  const [createdCreds, setCreatedCreds] = useState(null)
  const [message, setMessage] = useState(null)

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

      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: form.email, password: tempPassword,
      })
      if (signUpError) throw signUpError
      const newUserId = signUpData.user.id

      await supabase.auth.setSession({
        access_token: adminSession.access_token,
        refresh_token: adminSession.refresh_token,
      })

      const { error: profileError } = await supabase.rpc('create_user_profile', {
        p_id: newUserId, p_full_name: '', p_phone: form.phone,
        p_role: 'owner', p_gym_id: null, p_temp_password: tempPassword,
      })
      if (profileError) throw profileError

      const { data: gymData, error: gymError } = await supabase
        .from('gyms')
        .insert([{ name: form.gymName, location: form.location, owner_id: newUserId }])
        .select().single()
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
          <div className="flex items-center gap-2 mb-3">
            <span>🔑</span>
            <h3 className="text-orange-500 font-bold text-sm">{t('admin_creds_title')}</h3>
          </div>
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
          <button onClick={() => setCreatedCreds(null)}
            className="mt-3 text-xs text-gray-400 dark:text-zinc-500 hover:text-gray-900 dark:hover:text-white underline transition-colors">
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
            <div key={owner.id} className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl px-5 py-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-10 h-10 bg-orange-500/10 text-orange-500 rounded-xl flex items-center justify-center font-black shrink-0">
                  {owner.gym_name?.charAt(0)?.toUpperCase() || '?'}
                </div>
                <div className="min-w-0">
                  <p className="text-gray-900 dark:text-white font-bold truncate">{owner.gym_name || t('admin_no_gym')}</p>
                  <p className="text-gray-400 dark:text-zinc-500 text-xs mt-0.5">
                    {owner.gym_location || t('admin_no_location')} · {owner.phone || '—'}
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
              </div>
            </div>
          ))}
        </div>
      )}

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
                <input type="email" placeholder="owner@example.com" value={form.email}
                  onChange={set('email')} required className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>{t('admin_phone')}</label>
                <input type="tel" placeholder="+216 00 000 000" value={form.phone}
                  onChange={set('phone')} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>{t('admin_gym_name')}</label>
                <input type="text" placeholder={t('admin_gym_name_placeholder')} value={form.gymName}
                  onChange={set('gymName')} required className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>{t('admin_location')}</label>
                <input type="text" placeholder={t('admin_location_placeholder')} value={form.location}
                  onChange={set('location')} className={inputClass} />
              </div>

              {message && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl px-4 py-3 text-sm">
                  {message.text}
                </div>
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