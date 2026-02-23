import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import { useLanguage } from './context/LanguageContext'

const generateTempPassword = () => {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  return Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

const PasswordReveal = ({ password }) => {
  const [visible, setVisible] = useState(false)
  return (
    <div className="flex items-center gap-1 mt-1 flex-wrap">
      <span className="text-[10px] bg-yellow-500/10 border border-yellow-500/30 text-yellow-500 px-2 py-0.5 rounded-full font-mono">
        {visible ? password : '••••••••••'}
      </span>
      <button
        onClick={() => setVisible(v => !v)}
        className="text-[10px] text-gray-400 dark:text-zinc-500 hover:text-orange-500 transition-colors underline">
        {visible ? 'hide' : '🔑 reveal'}
      </button>
    </div>
  )
}

export default function CoachesList() {
  const { t } = useLanguage()
  const [coaches, setCoaches] = useState([])
  const [loading, setLoading] = useState(true)
  const [gymId, setGymId] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ email: '', fullName: '', phone: '' })
  const [creating, setCreating] = useState(false)
  const [createdCreds, setCreatedCreds] = useState(null)
  const [message, setMessage] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }))

  const fetchCoaches = async () => {
    setLoading(true)
    const { data: profile } = await supabase.rpc('get_my_profile')
    setGymId(profile?.gym_id || null)
    const { data } = await supabase.rpc('get_gym_coaches')
    setCoaches(data || [])
    setLoading(false)
  }

  useEffect(() => { fetchCoaches() }, [])

  const handleCreate = async (e) => {
    e.preventDefault()
    setCreating(true)
    setMessage(null)
    const tempPassword = generateTempPassword()
    try {
      const { data: { session: ownerSession } } = await supabase.auth.getSession()

      // Always fetch gym_id fresh — don't rely on state which may be stale
      const { data: ownerProfile } = await supabase.rpc('get_my_profile')
      const currentGymId = ownerProfile?.gym_id
      if (!currentGymId) throw new Error('Owner gym not found. Make sure your account has a gym assigned.')

      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: form.email, password: tempPassword,
      })
      if (signUpError) throw signUpError
      const newUserId = signUpData.user.id

      await supabase.auth.setSession({
        access_token: ownerSession.access_token,
        refresh_token: ownerSession.refresh_token,
      })

      const { error: profileError } = await supabase.rpc('create_user_profile', {
        p_id: newUserId,
        p_full_name: form.fullName,
        p_phone: form.phone || '',
        p_role: 'coach',
        p_gym_id: currentGymId,
        p_temp_password: tempPassword,
      })
      if (profileError) throw profileError

      setCreatedCreds({ email: form.email, password: tempPassword })
      setForm({ email: '', fullName: '', phone: '' })
      setShowModal(false)
      fetchCoaches()
    } catch (err) {
      setMessage({ type: 'error', text: err.message })
    }
    setCreating(false)
  }

  const handleDelete = async (id) => {
    await supabase.rpc('delete_coach', { p_id: id })
    setDeleteConfirm(null)
    fetchCoaches()
  }

  const inputClass = "w-full bg-gray-100 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-zinc-600 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-500 transition-colors"
  const labelClass = "text-xs text-gray-500 dark:text-zinc-400 uppercase tracking-widest block mb-1.5"

  return (
    <div className="space-y-6">

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

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-gray-900 dark:text-white font-bold text-lg">{t('view_coaches')}</h2>
          <p className="text-gray-400 dark:text-zinc-500 text-sm">{coaches.length} {t('nav_coaches').toLowerCase()}</p>
        </div>
        <button onClick={() => { setShowModal(true); setMessage(null) }}
          className="bg-orange-500 hover:bg-orange-400 text-black font-bold px-5 py-2.5 rounded-xl text-sm transition-colors">
          + {t('coach_create_button')}
        </button>
      </div>

      {/* Coaches Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse">
          {[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-gray-100 dark:bg-zinc-900 rounded-2xl" />)}
        </div>
      ) : coaches.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-zinc-900/50 rounded-2xl border-2 border-dashed border-gray-200 dark:border-zinc-800 text-gray-400 dark:text-zinc-500 text-sm">
          {t('coaches_empty')}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {coaches.map(coach => (
            <div key={coach.id} className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 hover:border-orange-500/40 rounded-2xl p-5 flex items-center gap-4 transition-all group">
              <div className="w-12 h-12 bg-orange-500/10 text-orange-500 rounded-xl flex items-center justify-center font-black text-lg shrink-0 overflow-hidden">
                {coach.avatar_url
                  ? <img src={coach.avatar_url} alt="" className="w-full h-full object-cover" />
                  : coach.full_name?.charAt(0)?.toUpperCase()
                }
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-gray-900 dark:text-white font-bold truncate">{coach.full_name}</p>
                <p className="text-gray-400 dark:text-zinc-500 text-xs mt-0.5">{coach.phone || '—'}</p>
                {coach.first_login && coach.temp_password && (
                  <PasswordReveal password={coach.temp_password} />
                )}
                {coach.first_login && !coach.temp_password && (
                  <span className="text-[10px] bg-yellow-500/10 border border-yellow-500/30 text-yellow-500 px-2 py-0.5 rounded-full font-mono mt-1 inline-block">
                    {t('admin_awaiting_login')}
                  </span>
                )}
              </div>
              <button
                onClick={() => setDeleteConfirm(coach.id)}
                className="text-gray-300 dark:text-zinc-700 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 shrink-0">
                🗑️
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add Coach Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl p-6 w-full max-w-md space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-gray-900 dark:text-white font-bold text-lg">{t('coach_create_title')}</h3>
                <p className="text-gray-500 dark:text-zinc-500 text-sm mt-0.5">{t('coach_create_subtitle')}</p>
              </div>
              <button onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors text-lg">✕</button>
            </div>

            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className={labelClass}>{t('col_name')}</label>
                <input type="text" placeholder="John Coach" value={form.fullName}
                  onChange={set('fullName')} required className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>{t('col_phone')}</label>
                <input type="tel" placeholder="+216 00 000 000" value={form.phone}
                  onChange={set('phone')} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>{t('admin_owner_email')}</label>
                <input type="email" placeholder="coach@example.com" value={form.email}
                  onChange={set('email')} required className={inputClass} />
              </div>

              {message && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl px-4 py-3 text-sm">
                  {message.text}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={creating}
                  className="flex-1 bg-orange-500 hover:bg-orange-400 disabled:opacity-50 text-black font-bold py-3 rounded-xl text-sm transition-colors">
                  {creating ? t('admin_creating') : t('coach_create_button')}
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