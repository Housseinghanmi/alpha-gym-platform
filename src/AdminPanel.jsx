import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import { useLanguage } from './context/LanguageContext'

export default function AdminPanel() {
  const { t } = useLanguage()
  const [email, setEmail] = useState('')
  const [gymName, setGymName] = useState('')
  const [gymLocation, setGymLocation] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(null)
  const [owners, setOwners] = useState([])
  const [loadingOwners, setLoadingOwners] = useState(true)

  const fetchOwners = async () => {
    setLoadingOwners(true)
    const { data, error } = await supabase
      .from('profiles')
      .select(`id, full_name, gyms ( name, location )`)
      .eq('role', 'owner')
    if (!error) setOwners(data || [])
    setLoadingOwners(false)
  }

  useEffect(() => { fetchOwners() }, [])

  const handleCreate = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)
    try {
      const { data: inviteData, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(email)
      if (inviteError) throw inviteError
      const newUserId = inviteData.user.id

      const { data: gymData, error: gymError } = await supabase
        .from('gyms')
        .insert([{ name: gymName, location: gymLocation, owner_id: newUserId }])
        .select().single()
      if (gymError) throw gymError

      const { error: profileError } = await supabase
        .from('profiles')
        .insert([{ id: newUserId, full_name: '', role: 'owner', gym_id: gymData.id }])
      if (profileError) throw profileError

      setMessage({ type: 'success', text: `${t('admin_create_button')} ✓ — ${email}` })
      setEmail(''); setGymName(''); setGymLocation('')
      fetchOwners()
    } catch (err) {
      setMessage({ type: 'error', text: err.message })
    }
    setLoading(false)
  }

  return (
    <div className="max-w-3xl space-y-8">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
        <h2 className="text-lg font-bold text-white mb-1">{t('admin_create_title')}</h2>
        <p className="text-zinc-500 text-sm mb-6">{t('admin_create_subtitle')}</p>

        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="text-xs text-zinc-400 uppercase tracking-widest block mb-1.5">{t('admin_owner_email')}</label>
            <input type="email" placeholder="owner@example.com" value={email}
              onChange={e => setEmail(e.target.value)} required
              className="w-full bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-600 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-orange-500 transition-colors" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-zinc-400 uppercase tracking-widest block mb-1.5">{t('admin_gym_name')}</label>
              <input type="text" placeholder={t('admin_gym_name_placeholder')} value={gymName}
                onChange={e => setGymName(e.target.value)} required
                className="w-full bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-600 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-orange-500 transition-colors" />
            </div>
            <div>
              <label className="text-xs text-zinc-400 uppercase tracking-widest block mb-1.5">{t('admin_location')}</label>
              <input type="text" placeholder={t('admin_location_placeholder')} value={gymLocation}
                onChange={e => setGymLocation(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-600 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-orange-500 transition-colors" />
            </div>
          </div>

          {message && (
            <div className={`rounded-lg px-4 py-3 text-sm font-medium ${
              message.type === 'success'
                ? 'bg-orange-500/10 border border-orange-500/30 text-orange-400'
                : 'bg-red-500/10 border border-red-500/30 text-red-400'
            }`}>{message.text}</div>
          )}

          <button type="submit" disabled={loading}
            className="w-full bg-orange-500 hover:bg-orange-400 disabled:opacity-50 disabled:cursor-not-allowed text-black font-bold py-3 rounded-lg text-sm tracking-wide transition-colors">
            {loading ? t('admin_creating') : t('admin_create_button')}
          </button>
        </form>
      </div>

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
              <div key={owner.id} className="flex items-center justify-between bg-zinc-800 rounded-xl px-4 py-3">
                <div>
                  <p className="text-white font-medium text-sm">{owner.full_name || t('admin_pending')}</p>
                  <p className="text-zinc-500 text-xs mt-0.5">
                    {owner.gyms?.name ? `${owner.gyms.name} — ${owner.gyms.location || t('admin_no_location')}` : t('admin_no_gym')}
                  </p>
                </div>
                <span className="text-xs bg-zinc-700 text-orange-500 px-2 py-1 rounded-md font-mono uppercase tracking-wider">
                  {t('admin_owner_badge')}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}