import { useState, useEffect, useRef } from 'react'
import { supabase } from './supabaseClient'
import { useLanguage } from './context/LanguageContext'

const TABS = ['profile', 'edit', 'security']

export default function ProfilePage() {
  const { t } = useLanguage()
  const [activeTab, setActiveTab] = useState('profile')
  const [profile, setProfile] = useState(null)
  const [gymName, setGymName] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)
  const [form, setForm] = useState({ full_name: '', bio: '' })
  const [passwords, setPasswords] = useState({ current: '', next: '', confirm: '' })
  const avatarRef = useRef()
  const bannerRef = useRef()

  const fetchProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    const { data } = await supabase
      .from('profiles')
      .select('*, gyms(name)')
      .eq('id', user.id)
      .single()
    if (data) {
      setProfile({ ...data, email: user.email })
      setGymName(data.gyms?.name || '')
      setForm({ full_name: data.full_name || '', bio: data.bio || '' })
    }
    setLoading(false)
  }

  useEffect(() => { fetchProfile() }, [])

  const uploadFile = async (file, bucket, userId) => {
    const ext = file.name.split('.').pop()
    const path = `${userId}.${ext}`
    const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true })
    if (error) throw error
    const { data } = supabase.storage.from(bucket).getPublicUrl(path)
    return data.publicUrl
  }

  const handleSaveProfile = async () => {
    setSaving(true)
    setMessage(null)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      let updates = { full_name: form.full_name, bio: form.bio }

      if (avatarRef.current?.files[0]) {
        updates.avatar_url = await uploadFile(avatarRef.current.files[0], 'avatars', user.id)
      }
      if (bannerRef.current?.files[0]) {
        updates.banner_url = await uploadFile(bannerRef.current.files[0], 'banners', user.id)
      }

      const { error } = await supabase.from('profiles').update(updates).eq('id', user.id)
      if (error) throw error
      setMessage({ type: 'success', text: t('profile_saved') })
      fetchProfile()
    } catch (err) {
      setMessage({ type: 'error', text: err.message })
    }
    setSaving(false)
  }

  const handleChangePassword = async () => {
    setMessage(null)
    if (passwords.next !== passwords.confirm) {
      setMessage({ type: 'error', text: t('set_password_mismatch') })
      return
    }
    if (passwords.next.length < 8) {
      setMessage({ type: 'error', text: t('set_password_too_short') })
      return
    }
    setSaving(true)
    const { error } = await supabase.auth.updateUser({ password: passwords.next })
    if (error) setMessage({ type: 'error', text: error.message })
    else {
      setMessage({ type: 'success', text: t('password_changed') })
      setPasswords({ current: '', next: '', confirm: '' })
    }
    setSaving(false)
  }

  if (loading) return <div className="text-gray-400 dark:text-zinc-500 animate-pulse">{t('loading')}</div>

  const roleColors = {
    admin: 'bg-purple-500/10 border-purple-500/30 text-purple-400',
    owner: 'bg-orange-500/10 border-orange-500/30 text-orange-400',
    coach: 'bg-blue-500/10 border-blue-500/30 text-blue-400',
  }

  const tabLabel = { profile: t('tab_profile'), edit: t('tab_edit'), security: t('tab_security') }

  return (
    <div className="max-w-2xl space-y-6">

      {/* Tab Bar */}
      <div className="flex bg-gray-100 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-1 gap-1">
        {TABS.map(tab => (
          <button key={tab} onClick={() => { setActiveTab(tab); setMessage(null) }}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all duration-150
              ${activeTab === tab
                ? 'bg-white dark:bg-zinc-800 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 dark:text-zinc-500 hover:text-gray-700 dark:hover:text-zinc-300'
              }`}>
            {tabLabel[tab]}
          </button>
        ))}
      </div>

      {/* ── TAB: MY PROFILE ── */}
      {activeTab === 'profile' && (
        <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl overflow-hidden">
          {/* Banner */}
          <div className="h-32 bg-gradient-to-r from-orange-500/20 via-orange-500/10 to-transparent relative">
            {profile?.banner_url && (
              <img src={profile.banner_url} alt="banner"
                className="w-full h-full object-cover absolute inset-0" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-white/10 dark:from-black/30 to-transparent" />
          </div>

          {/* Avatar + Info */}
          <div className="px-6 pb-6">
            <div className="-mt-10 mb-4">
              <div className="w-20 h-20 rounded-2xl border-4 border-white dark:border-zinc-900 bg-orange-500/20 flex items-center justify-center overflow-hidden">
                {profile?.avatar_url
                  ? <img src={profile.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                  : <span className="text-3xl font-black text-orange-500">
                      {profile?.full_name?.[0]?.toUpperCase() || '?'}
                    </span>
                }
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-3 flex-wrap">
                <h2 className="text-xl font-black text-gray-900 dark:text-white">
                  {profile?.full_name || t('admin_pending')}
                </h2>
                <span className={`text-xs px-2 py-1 rounded-md border font-mono uppercase tracking-wider ${roleColors[profile?.role]}`}>
                  {t(`role_${profile?.role}`)}
                </span>
              </div>
              <p className="text-gray-500 dark:text-zinc-400 text-sm">{profile?.email}</p>
              {gymName && <p className="text-gray-400 dark:text-zinc-500 text-sm">🏢 {gymName}</p>}
              {profile?.phone && <p className="text-gray-400 dark:text-zinc-500 text-sm">📞 {profile.phone}</p>}
              {profile?.bio && (
                <p className="text-gray-600 dark:text-zinc-300 text-sm mt-3 pt-3 border-t border-gray-100 dark:border-zinc-800 leading-relaxed">
                  {profile.bio}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── TAB: EDIT PROFILE ── */}
      {activeTab === 'edit' && (
        <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl p-6 space-y-5">
          <h3 className="text-gray-900 dark:text-white font-bold">{t('tab_edit')}</h3>

          {/* Banner Upload */}
          <div>
            <label className="text-xs text-gray-500 dark:text-zinc-400 uppercase tracking-widest block mb-2">{t('profile_banner')}</label>
            <div className="h-24 rounded-xl bg-gray-100 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 overflow-hidden relative cursor-pointer"
              onClick={() => bannerRef.current.click()}>
              {profile?.banner_url
                ? <img src={profile.banner_url} alt="banner" className="w-full h-full object-cover" />
                : <div className="flex items-center justify-center h-full text-gray-400 dark:text-zinc-500 text-sm">
                    {t('profile_upload_banner')}
                  </div>
              }
              <div className="absolute inset-0 bg-black/0 hover:bg-black/20 transition-colors flex items-center justify-center">
                <span className="opacity-0 hover:opacity-100 text-white text-xs font-medium">Change</span>
              </div>
            </div>
            <input type="file" ref={bannerRef} accept="image/*" className="hidden" />
          </div>

          {/* Avatar Upload */}
          <div>
            <label className="text-xs text-gray-500 dark:text-zinc-400 uppercase tracking-widest block mb-2">{t('profile_avatar')}</label>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-xl bg-orange-500/20 border border-gray-200 dark:border-zinc-700 flex items-center justify-center overflow-hidden cursor-pointer"
                onClick={() => avatarRef.current.click()}>
                {profile?.avatar_url
                  ? <img src={profile.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                  : <span className="text-2xl font-black text-orange-500">
                      {profile?.full_name?.[0]?.toUpperCase() || '?'}
                    </span>
                }
              </div>
              <button onClick={() => avatarRef.current.click()}
                className="text-sm text-orange-500 hover:text-orange-400 transition-colors">
                {t('profile_upload_avatar')}
              </button>
            </div>
            <input type="file" ref={avatarRef} accept="image/*" className="hidden" />
          </div>

          {/* Full Name */}
          <div>
            <label className="text-xs text-gray-500 dark:text-zinc-400 uppercase tracking-widest block mb-1.5">{t('col_name')}</label>
            <input type="text" value={form.full_name}
              onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
              className="w-full bg-gray-100 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-gray-900 dark:text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-500 transition-colors" />
          </div>

          {/* Bio */}
          <div>
            <label className="text-xs text-gray-500 dark:text-zinc-400 uppercase tracking-widest block mb-1.5">{t('profile_bio')}</label>
            <textarea value={form.bio} rows={4}
              onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
              placeholder={t('profile_bio_placeholder')}
              className="w-full bg-gray-100 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-zinc-600 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-500 transition-colors resize-none" />
          </div>

          {message && (
            <div className={`rounded-xl px-4 py-3 text-sm font-medium ${
              message.type === 'success'
                ? 'bg-green-500/10 border border-green-500/30 text-green-500'
                : 'bg-red-500/10 border border-red-500/30 text-red-400'
            }`}>{message.text}</div>
          )}

          <button onClick={handleSaveProfile} disabled={saving}
            className="w-full bg-orange-500 hover:bg-orange-400 disabled:opacity-50 text-black font-bold py-3 rounded-xl text-sm tracking-wide transition-colors">
            {saving ? t('saving') : t('action_save')}
          </button>
        </div>
      )}

      {/* ── TAB: SECURITY ── */}
      {activeTab === 'security' && (
        <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl p-6 space-y-4">
          <h3 className="text-gray-900 dark:text-white font-bold">{t('tab_security')}</h3>
          <p className="text-gray-500 dark:text-zinc-500 text-sm">{t('security_subtitle')}</p>

          {[
            { label: t('set_password_new'), field: 'next' },
            { label: t('set_password_confirm'), field: 'confirm' },
          ].map(({ label, field }) => (
            <div key={field}>
              <label className="text-xs text-gray-500 dark:text-zinc-400 uppercase tracking-widest block mb-1.5">{label}</label>
              <input type="password" placeholder="••••••••"
                value={passwords[field]}
                onChange={e => setPasswords(p => ({ ...p, [field]: e.target.value }))}
                className="w-full bg-gray-100 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-gray-900 dark:text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-500 transition-colors" />
            </div>
          ))}

          <p className="text-gray-400 dark:text-zinc-600 text-xs">{t('set_password_hint')}</p>

          {message && (
            <div className={`rounded-xl px-4 py-3 text-sm font-medium ${
              message.type === 'success'
                ? 'bg-green-500/10 border border-green-500/30 text-green-500'
                : 'bg-red-500/10 border border-red-500/30 text-red-400'
            }`}>{message.text}</div>
          )}

          <button onClick={handleChangePassword} disabled={saving}
            className="w-full bg-orange-500 hover:bg-orange-400 disabled:opacity-50 text-black font-bold py-3 rounded-xl text-sm tracking-wide transition-colors">
            {saving ? t('saving') : t('security_button')}
          </button>
        </div>
      )}
    </div>
  )
}