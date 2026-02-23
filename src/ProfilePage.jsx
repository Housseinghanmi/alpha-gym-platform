import { useState, useEffect, useRef } from 'react'
import { supabase } from './supabaseClient'
import { useLanguage } from './context/LanguageContext'

export default function ProfilePage() {
  const { t } = useLanguage()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [confirmPopup, setConfirmPopup] = useState(false)
  const [passwordConfirmPopup, setPasswordConfirmPopup] = useState(false)
  const [message, setMessage] = useState(null)
  const [form, setForm] = useState({ full_name: '', phone: '', bio: '' })
  const [passwords, setPasswords] = useState({ next: '', confirm: '' })
  const [avatarPreview, setAvatarPreview] = useState(null)
  const [bannerPreview, setBannerPreview] = useState(null)
  const [pendingAvatarFile, setPendingAvatarFile] = useState(null)
  const [pendingBannerFile, setPendingBannerFile] = useState(null)
  const avatarRef = useRef()
  const bannerRef = useRef()

  const fetchProfile = async () => {
    const { data } = await supabase.rpc('get_my_profile')
    if (data) {
      const { data: { user } } = await supabase.auth.getUser()
      setProfile({ ...data, email: user.email })
      setForm({ full_name: data.full_name || '', phone: data.phone || '', bio: data.bio || '' })
    }
    setLoading(false)
  }

  useEffect(() => { fetchProfile() }, [])

  const handleFileChange = (file, type) => {
    if (!file) return
    const url = URL.createObjectURL(file)
    if (type === 'avatar') { setPendingAvatarFile(file); setAvatarPreview(url) }
    else { setPendingBannerFile(file); setBannerPreview(url) }
  }

  const uploadFile = async (file, bucket, userId) => {
    const ext = file.name.split('.').pop()
    const path = `${userId}.${ext}`
    const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true })
    if (error) throw error
    return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl
  }

  const handleSaveProfile = async () => {
    setSaving(true)
    setMessage(null)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      let avatarUrl = profile.avatar_url
      let bannerUrl = profile.banner_url

      if (pendingAvatarFile) avatarUrl = await uploadFile(pendingAvatarFile, 'avatars', user.id)
      if (pendingBannerFile) bannerUrl = await uploadFile(pendingBannerFile, 'banners', user.id)

      const { error } = await supabase.rpc('update_my_profile', {
        p_full_name: form.full_name,
        p_phone: form.phone,
        p_bio: form.bio,
      })
      if (error) throw error

      // Update avatar/banner separately if changed
      if (pendingAvatarFile || pendingBannerFile) {
        await supabase.from('profiles').update({
          ...(pendingAvatarFile && { avatar_url: avatarUrl }),
          ...(pendingBannerFile && { banner_url: bannerUrl }),
        }).eq('id', user.id)
      }

      setMessage({ type: 'success', text: t('profile_saved') })
      setEditing(false)
      setConfirmPopup(false)
      setPendingAvatarFile(null)
      setPendingBannerFile(null)
      setAvatarPreview(null)
      setBannerPreview(null)
      fetchProfile()
    } catch (err) {
      setMessage({ type: 'error', text: err.message })
      setConfirmPopup(false)
    }
    setSaving(false)
  }

  const handleChangePassword = async () => {
    setMessage(null)
    if (passwords.next !== passwords.confirm) {
      setMessage({ type: 'error', text: t('set_password_mismatch') })
      setPasswordConfirmPopup(false)
      return
    }
    if (passwords.next.length < 8) {
      setMessage({ type: 'error', text: t('set_password_too_short') })
      setPasswordConfirmPopup(false)
      return
    }
    setSaving(true)
    const { error } = await supabase.auth.updateUser({ password: passwords.next })
    if (error) setMessage({ type: 'error', text: error.message })
    else {
      setMessage({ type: 'success', text: t('password_changed') })
      setPasswords({ next: '', confirm: '' })
    }
    setPasswordConfirmPopup(false)
    setSaving(false)
  }

  const cancelEdit = () => {
    setEditing(false)
    setPendingAvatarFile(null)
    setPendingBannerFile(null)
    setAvatarPreview(null)
    setBannerPreview(null)
    setForm({ full_name: profile.full_name || '', phone: profile.phone || '', bio: profile.bio || '' })
  }

  if (loading) return (
    <div className="text-gray-400 dark:text-zinc-500 animate-pulse">{t('loading')}</div>
  )

  const roleColors = {
    admin: 'bg-purple-500/10 border-purple-500/30 text-purple-400',
    owner: 'bg-orange-500/10 border-orange-500/30 text-orange-500',
    coach: 'bg-blue-500/10 border-blue-500/30 text-blue-400',
  }

  const displayName = profile?.full_name || profile?.email?.split('@')[0] || '?'
  const avatarSrc = avatarPreview || profile?.avatar_url
  const bannerSrc = bannerPreview || profile?.banner_url

  const inputClass = "w-full bg-gray-100 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-zinc-600 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-500 transition-colors"
  const labelClass = "text-xs text-gray-500 dark:text-zinc-400 uppercase tracking-widest block mb-1.5"

  return (
    <div className="max-w-2xl space-y-4">

      {/* Header row */}
      <div className="flex items-center justify-end">
        {!editing ? (
          <button onClick={() => setEditing(true)}
            className="bg-orange-500 hover:bg-orange-400 text-black font-bold px-5 py-2 rounded-xl text-sm transition-colors">
            ✏️ {t('action_edit_profile')}
          </button>
        ) : (
          <div className="flex gap-2">
            <button onClick={cancelEdit}
              className="bg-gray-200 dark:bg-zinc-800 hover:bg-gray-300 dark:hover:bg-zinc-700 text-gray-700 dark:text-white font-bold px-5 py-2 rounded-xl text-sm transition-colors">
              {t('action_cancel')}
            </button>
            <button onClick={() => setConfirmPopup(true)}
              className="bg-orange-500 hover:bg-orange-400 text-black font-bold px-5 py-2 rounded-xl text-sm transition-colors">
              {t('action_save')}
            </button>
          </div>
        )}
      </div>

      {/* Message */}
      {message && (
        <div className={`rounded-xl px-4 py-3 text-sm font-medium ${
          message.type === 'success'
            ? 'bg-green-500/10 border border-green-500/30 text-green-500'
            : 'bg-red-500/10 border border-red-500/30 text-red-400'
        }`}>{message.text}</div>
      )}

      {/* ── Section 1: Banner + Avatar ── */}
      <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl overflow-hidden">
        {/* Banner */}
        <div className="h-36 bg-gradient-to-r from-orange-500/20 via-orange-400/10 to-transparent relative">
          {bannerSrc && <img src={bannerSrc} alt="banner" className="w-full h-full object-cover absolute inset-0" />}
          <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent" />
          {editing && (
            <button onClick={() => bannerRef.current.click()}
              className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/50 transition-colors">
              <span className="text-white text-sm font-medium bg-black/50 px-4 py-2 rounded-lg">
                📷 {t('profile_upload_banner')}
              </span>
            </button>
          )}
          <input type="file" ref={bannerRef} accept="image/*" className="hidden"
            onChange={e => handleFileChange(e.target.files[0], 'banner')} />
        </div>

        {/* Avatar + name */}
        <div className="px-6 pb-6">
          <div className="-mt-10 mb-4 relative w-20">
            <div className="w-20 h-20 rounded-2xl border-4 border-white dark:border-zinc-900 bg-orange-500/20 flex items-center justify-center overflow-hidden">
              {avatarSrc
                ? <img src={avatarSrc} alt="avatar" className="w-full h-full object-cover" />
                : <span className="text-3xl font-black text-orange-500">{displayName[0]?.toUpperCase()}</span>
              }
            </div>
            {editing && (
              <button onClick={() => avatarRef.current.click()}
                className="absolute -bottom-1 -right-1 w-7 h-7 bg-orange-500 hover:bg-orange-400 rounded-full flex items-center justify-center text-black text-sm font-bold transition-colors">
                +
              </button>
            )}
            <input type="file" ref={avatarRef} accept="image/*" className="hidden"
              onChange={e => handleFileChange(e.target.files[0], 'avatar')} />
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-xl font-black text-gray-900 dark:text-white">{displayName}</h2>
            <span className={`text-xs px-2 py-1 rounded-lg border font-mono uppercase tracking-wider ${roleColors[profile?.role]}`}>
              {t(`role_${profile?.role}`)}
            </span>
          </div>
          {profile?.gym_name && (
            <p className="text-gray-400 dark:text-zinc-500 text-sm mt-1">🏢 {profile.gym_name}</p>
          )}
        </div>
      </div>

      {/* ── Section 2: Basic & Contact Info ── */}
      <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl p-6 space-y-4">
        <h3 className="text-gray-500 dark:text-zinc-400 font-bold text-xs uppercase tracking-widest">{t('profile_basic_info')}</h3>

        {editing ? (
          <div className="space-y-4">
            <div>
              <label className={labelClass}>{t('col_name')}</label>
              <input type="text" value={form.full_name} className={inputClass}
                onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} />
            </div>
            <div>
              <label className={labelClass}>{t('add_phone')}</label>
              <input type="tel" value={form.phone} placeholder="+216 00 000 000" className={inputClass}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
            </div>
            <div>
              <label className={labelClass}>{t('profile_bio')}</label>
              <textarea value={form.bio} rows={3} placeholder={t('profile_bio_placeholder')}
                onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
                className={`${inputClass} resize-none`} />
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {[
              { label: t('col_name'), value: profile?.full_name },
              { label: t('add_phone'), value: profile?.phone },
              { label: 'Email', value: profile?.email },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-start gap-4">
                <span className="text-gray-400 dark:text-zinc-500 text-sm w-20 shrink-0">{label}</span>
                <span className="text-gray-900 dark:text-white text-sm font-medium">{value || '—'}</span>
              </div>
            ))}
            {profile?.bio && (
              <div className="pt-3 border-t border-gray-100 dark:border-zinc-800">
                <p className="text-gray-600 dark:text-zinc-300 text-sm leading-relaxed">{profile.bio}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Section 3: Security ── */}
      <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl p-6 space-y-4">
        <h3 className="text-gray-500 dark:text-zinc-400 font-bold text-xs uppercase tracking-widest">{t('tab_security')}</h3>
        <p className="text-gray-500 dark:text-zinc-500 text-sm">{t('security_subtitle')}</p>

        <div className="space-y-3">
          <div>
            <label className={labelClass}>{t('set_password_new')}</label>
            <input type="password" placeholder="••••••••" value={passwords.next}
              onChange={e => setPasswords(p => ({ ...p, next: e.target.value }))}
              className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>{t('set_password_confirm')}</label>
            <input type="password" placeholder="••••••••" value={passwords.confirm}
              onChange={e => setPasswords(p => ({ ...p, confirm: e.target.value }))}
              className={inputClass} />
          </div>
          <p className="text-gray-400 dark:text-zinc-600 text-xs">{t('set_password_hint')}</p>
        </div>

        <button
          onClick={() => setPasswordConfirmPopup(true)}
          disabled={!passwords.next || !passwords.confirm}
          className="w-full bg-orange-500 hover:bg-orange-400 disabled:opacity-40 disabled:cursor-not-allowed text-black font-bold py-3 rounded-xl text-sm transition-colors">
          {t('security_button')}
        </button>
      </div>

      {/* Confirm Save Popup */}
      {confirmPopup && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl p-6 w-full max-w-sm text-center space-y-4">
            <p className="text-3xl">💾</p>
            <p className="text-gray-900 dark:text-white font-bold">{t('confirm_save_title')}</p>
            <p className="text-gray-500 dark:text-zinc-500 text-sm">{t('confirm_save_subtitle')}</p>
            <div className="flex gap-3">
              <button onClick={handleSaveProfile} disabled={saving}
                className="flex-1 bg-orange-500 hover:bg-orange-400 disabled:opacity-50 text-black font-bold py-2.5 rounded-xl text-sm transition-colors">
                {saving ? t('saving') : t('action_confirm')}
              </button>
              <button onClick={() => setConfirmPopup(false)}
                className="flex-1 bg-gray-200 dark:bg-zinc-800 text-gray-700 dark:text-white py-2.5 rounded-xl text-sm transition-colors">
                {t('action_cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Password Popup */}
      {passwordConfirmPopup && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl p-6 w-full max-w-sm text-center space-y-4">
            <p className="text-3xl">🔐</p>
            <p className="text-gray-900 dark:text-white font-bold">{t('confirm_password_title')}</p>
            <p className="text-gray-500 dark:text-zinc-500 text-sm">{t('confirm_password_subtitle')}</p>
            <div className="flex gap-3">
              <button onClick={handleChangePassword} disabled={saving}
                className="flex-1 bg-orange-500 hover:bg-orange-400 disabled:opacity-50 text-black font-bold py-2.5 rounded-xl text-sm transition-colors">
                {saving ? t('saving') : t('action_confirm')}
              </button>
              <button onClick={() => setPasswordConfirmPopup(false)}
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