import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import { useLanguage } from './context/LanguageContext'

const generateTempPassword = () => {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  return Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

export default function AdminPanel() {
  const { t } = useLanguage()
  const [form, setForm] = useState({ email: '', gymName: '', location: '', phone: '' })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(null)
  const [createdCreds, setCreatedCreds] = useState(null)
  const [owners, setOwners] = useState([])
  const [loadingOwners, setLoadingOwners] = useState(true)

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }))

  const fetchOwners = async () => {
    setLoadingOwners(true)
    const { data, error } = await supabase
      .from('profiles')
      .select(`id, full_name, phone, first_login, gyms ( name, location )`)
      .eq('role', 'owner')
    if (!error) setOwners(data || [])
    setLoadingOwners(false)
  }

  useEffect(() => { fetchOwners() }, [])

  const handleCreate = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)
    setCreatedCreds(null)

    const tempPassword = generateTempPassword()

    try {
      // 1. Create user account with temp password
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: form.email,
        password: tempPassword,
      })
      if (signUpError) throw signUpError

      const newUserId = signUpData.user.id

      // 2. Create the gym
      const { data: gymData, error: gymError } = await supabase
        .from('gyms')
        .insert([{ name: form.gymName, location: form.location, owner_id: newUserId }])
        .select().single()
      if (gymError) throw gymError

      // 3. Create profile with first_login: true
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert([{
          id: newUserId,
          full_name: '',
          role: 'owner',
          gym_id: gymData.id,
          phone: form.phone,
          first_login: true,
        }])
      if (profileError) throw profileError

      // Show credentials to admin
      setCreatedCreds({ email: form.email, password: tempPassword })
      setForm({ email: '', gymName: '', location: '', phone: '' })
      fetchOwners()

    } catch (err) {
      setMessage({ type: 'error', text: err.message })
    }

    setLoading(false)
  }

  return (
    <div className="max-w-3xl space-y-8">

      {/* Create Form */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
        <h2 className="text-lg font-bold text-white mb-1">{t('admin_create_title')}</h2>
        <p className="text-zinc-500 text-sm mb-6">{t('admin_create_subtitle')}</p>

        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-zinc-400 uppercase tracking-widest block mb-1.5">{t('admin_owner_email')}</label>
              <input type="email" placeholder="owner@example.com" value={form.email}
                onChange={set('email')} required
                className="w-full bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-600 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-orange-500 transition-colors" />
            </div>
            <div>
              <label className="text-xs text-zinc-400 uppercase tracking-widest block mb-1.5">{t('admin_phone')}</label>
              <input type="tel" placeholder="+216 00 000 000" value={form.phone}
                onChange={set('phone')}
                className="w-full bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-600 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-orange-500 transition-colors" />
            </div>
            <div>
              <label className="text-xs text-zinc-400 uppercase tracking-widest block mb-1.5">{t('admin_gym_name')}</label>
              <input type="text" placeholder={t('admin_gym_name_placeholder')} value={form.gymName}
                onChange={set('gymName')} required
                className="w-full bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-600 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-orange-500 transition-colors" />
            </div>
            <div>
              <label className="text-xs text-zinc-400 uppercase tracking-widest block mb-1.5">{t('admin_location')}</label>
              <input type="text" placeholder={t('admin_location_placeholder')} value={form.location}
                onChange={set('location')}
                className="w-full bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-600 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-orange-500 transition-colors" />
            </div>
          </div>

          {message && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg px-4 py-3 text-sm">
              {message.text}
            </div>
          )}

          <button type="submit" disabled={loading}
            className="w-full bg-orange-500 hover:bg-orange-400 disabled:opacity-50 disabled:cursor-not-allowed text-black font-bold py-3 rounded-lg text-sm tracking-wide transition-colors">
            {loading ? t('admin_creating') : t('admin_create_button')}
          </button>
        </form>
      </div>

      {/* Temp credentials card — shown after creation */}
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
          <p className="text-zinc-600 text-xs mt-4">{t('admin_creds_warning')}</p>
          <button onClick={() => setCreatedCreds(null)}
            className="mt-4 text-xs text-zinc-500 hover:text-white transition-colors underline">
            {t('admin_creds_dismiss')}
          </button>
        </div>
      )}

      {/* Owners List */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
        <h2 className="text-lg font-bold text-white mb-4">{t('admin_owners_title')}</h2>
        {loadingOwners ? (
          <div className="text-zinc-500 text-sm animate-pulse">{t('admin_loading_owners')}</div>
        ) : owners.length === 0 ? (
          <div className="text-center py-8 border-2 border-dashed border-zinc-800 rounded-xl text-zinc-600 text-sm">
            {t('admin_no_owners')}
          </div>
        ) : (
          <div className="space-y-3">
            {owners.map(owner => (
              <div key={owner.id} className="flex items-center justify-between bg-zinc-800 rounded-xl px-4 py-3 gap-3">
                <div className="min-w-0">
                  <p className="text-white font-medium text-sm truncate">{owner.full_name || t('admin_pending')}</p>
                  <p className="text-zinc-500 text-xs mt-0.5 truncate">
                    {owner.gyms?.name ? `${owner.gyms.name} — ${owner.gyms.location || t('admin_no_location')}` : t('admin_no_gym')}
                  </p>
                  {owner.phone && (
                    <p className="text-zinc-600 text-xs mt-0.5">{owner.phone}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {owner.first_login && (
                    <span className="text-xs bg-yellow-500/10 border border-yellow-500/30 text-yellow-500 px-2 py-1 rounded-md font-mono">
                      {t('admin_awaiting_login')}
                    </span>
                  )}
                  <span className="text-xs bg-zinc-700 text-orange-500 px-2 py-1 rounded-md font-mono uppercase tracking-wider">
                    {t('admin_owner_badge')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}