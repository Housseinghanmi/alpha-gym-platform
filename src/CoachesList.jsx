import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import { useLanguage } from './context/LanguageContext'

const generateTempPassword = () => {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  return Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

export default function CoachesList() {
  const { t } = useLanguage()
  const [coaches, setCoaches] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ email: '', fullName: '', phone: '' })
  const [creating, setCreating] = useState(false)
  const [createdCreds, setCreatedCreds] = useState(null)
  const [message, setMessage] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [gymId, setGymId] = useState(null)
  const [ownerId, setOwnerId] = useState(null)

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }))

  const fetchCoaches = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    setOwnerId(user.id)

    const { data: profile } = await supabase
      .from('profiles')
      .select('gym_id')
      .eq('id', user.id)
      .single()

    setGymId(profile?.gym_id)

    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, phone, first_login')
      .eq('role', 'coach')
      .eq('gym_id', profile?.gym_id)

    setCoaches(data || [])
    setLoading(false)
  }

  useEffect(() => { fetchCoaches() }, [])

  const handleCreate = async (e) => {
    e.preventDefault()
    setCreating(true)
    setMessage(null)
    setCreatedCreds(null)

    const tempPassword = generateTempPassword()

    try {
      const { data: { session: ownerSession } } = await supabase.auth.getSession()

      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: form.email,
        password: tempPassword,
      })
      if (signUpError) throw signUpError

      const newUserId = signUpData.user.id

      await supabase.auth.setSession({
        access_token: ownerSession.access_token,
        refresh_token: ownerSession.refresh_token,
      })

      const { error: profileError } = await supabase
        .from('profiles')
        .upsert([{
          id: newUserId,
          full_name: form.fullName,
          role: 'coach',
          gym_id: gymId,
          phone: form.phone,
          first_login: true,
        }])
      if (profileError) throw profileError

      setCreatedCreds({ email: form.email, password: tempPassword })
      setForm({ email: '', fullName: '', phone: '' })
      fetchCoaches()
    } catch (err) {
      setMessage({ type: 'error', text: err.message })
    }
    setCreating(false)
  }

  const handleDelete = async (id) => {
    await supabase.from('profiles').delete().eq('id', id)
    setDeleteConfirm(null)
    fetchCoaches()
  }

  return (
    <div className="max-w-3xl space-y-8">

      {/* Add Coach Form */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
        <h2 className="text-lg font-bold text-white mb-1">{t('coach_create_title')}</h2>
        <p className="text-zinc-500 text-sm mb-6">{t('coach_create_subtitle')}</p>

        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-zinc-400 uppercase tracking-widest block mb-1.5">{t('col_name')}</label>
              <input type="text" placeholder="John Coach" value={form.fullName}
                onChange={set('fullName')} required
                className="w-full bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-600 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-orange-500 transition-colors" />
            </div>
            <div>
              <label className="text-xs text-zinc-400 uppercase tracking-widest block mb-1.5">{t('col_phone')}</label>
              <input type="tel" placeholder="+216 00 000 000" value={form.phone}
                onChange={set('phone')}
                className="w-full bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-600 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-orange-500 transition-colors" />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs text-zinc-400 uppercase tracking-widest block mb-1.5">{t('admin_owner_email')}</label>
              <input type="email" placeholder="coach@example.com" value={form.email}
                onChange={set('email')} required
                className="w-full bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-600 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-orange-500 transition-colors" />
            </div>
          </div>

          {message && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg px-4 py-3 text-sm">
              {message.text}
            </div>
          )}

          <button type="submit" disabled={creating}
            className="w-full bg-orange-500 hover:bg-orange-400 disabled:opacity-50 text-black font-bold py-3 rounded-lg text-sm tracking-wide transition-colors">
            {creating ? t('admin_creating') : t('coach_create_button')}
          </button>
        </form>
      </div>

      {/* Credentials Card */}
      {createdCreds && (
        <div className="bg-orange-500/10 border border-orange-500/40 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-orange-500 text-lg">🔑</span>
            <h3 className="text-orange-400 font-bold">{t('admin_creds_title')}</h3>
          </div>
          <p className="text-zinc-400 text-sm mb-4">{t('admin_creds_subtitle')}</p>
          <div className="space-y-3">
            <div className="bg-zinc-900 rounded-lg px-4 py-3 flex items-center justify-between">
              <span className="text-xs text-zinc-500 uppercase tracking-widest">{t('admin_owner_email')}</span>
              <span className="text-white font-mono text-sm">{createdCreds.email}</span>
            </div>
            <div className="bg-zinc-900 rounded-lg px-4 py-3 flex items-center justify-between">
              <span className="text-xs text-zinc-500 uppercase tracking-widest">{t('admin_temp_password')}</span>
              <span className="text-orange-400 font-mono text-sm font-bold tracking-widest">{createdCreds.password}</span>
            </div>
          </div>
          <button onClick={() => setCreatedCreds(null)}
            className="mt-4 text-xs text-zinc-500 hover:text-white transition-colors underline">
            {t('admin_creds_dismiss')}
          </button>
        </div>
      )}

      {/* Coaches List */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
        <h2 className="text-lg font-bold text-white mb-4">{t('coaches_list_title')}</h2>
        {loading ? (
          <div className="text-zinc-500 text-sm animate-pulse">{t('loading')}</div>
        ) : coaches.length === 0 ? (
          <div className="text-center py-8 border-2 border-dashed border-zinc-800 rounded-xl text-zinc-600 text-sm">
            {t('coaches_empty')}
          </div>
        ) : (
          <div className="space-y-3">
            {coaches.map(coach => (
              <div key={coach.id} className="flex items-center justify-between bg-zinc-800 rounded-xl px-4 py-3 gap-3">
                <div className="min-w-0">
                  <p className="text-white font-medium text-sm truncate">{coach.full_name || t('admin_pending')}</p>
                  {coach.phone && <p className="text-zinc-500 text-xs mt-0.5">{coach.phone}</p>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {coach.first_login && (
                    <span className="text-xs bg-yellow-500/10 border border-yellow-500/30 text-yellow-500 px-2 py-1 rounded-md font-mono">
                      {t('admin_awaiting_login')}
                    </span>
                  )}
                  <span className="text-xs bg-zinc-700 text-orange-500 px-2 py-1 rounded-md font-mono uppercase">
                    {t('nav_coaches')}
                  </span>
                  <button onClick={() => setDeleteConfirm(coach.id)}
                    className="text-zinc-500 hover:text-red-400 transition-colors text-sm">🗑️</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirm */}
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