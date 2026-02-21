import { useState } from 'react'
import { supabase } from './supabaseClient'
import { useLanguage } from './context/LanguageContext'

export default function SetPassword({ userId, onComplete }) {
  const { t } = useLanguage()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)

    if (password.length < 8) {
      setError(t('set_password_too_short'))
      return
    }
    if (password !== confirm) {
      setError(t('set_password_mismatch'))
      return
    }

    setLoading(true)

    // 1. Update password in Supabase Auth
    const { error: pwError } = await supabase.auth.updateUser({ password })
    if (pwError) {
      setError(pwError.message)
      setLoading(false)
      return
    }

    // 2. Flip first_login flag
    await supabase
      .from('profiles')
      .update({ first_login: false })
      .eq('id', userId)

    setLoading(false)
    onComplete()
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-6">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="text-orange-500 text-3xl font-black tracking-tighter">ALPHA GYM</div>
          <div className="text-zinc-600 text-xs tracking-widest uppercase mt-1">Platform</div>
        </div>

        {/* Card */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          <div className="mb-6">
            <h2 className="text-white text-xl font-black tracking-tight mb-1">{t('set_password_title')}</h2>
            <p className="text-zinc-500 text-sm">{t('set_password_subtitle')}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs text-zinc-400 uppercase tracking-widest block mb-1.5">
                {t('set_password_new')}
              </label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className="w-full bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-600 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-500 transition-colors"
              />
            </div>

            <div>
              <label className="text-xs text-zinc-400 uppercase tracking-widest block mb-1.5">
                {t('set_password_confirm')}
              </label>
              <input
                type="password"
                placeholder="••••••••"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                required
                className="w-full bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-600 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-500 transition-colors"
              />
            </div>

            {/* Password strength hint */}
            <p className="text-zinc-600 text-xs">{t('set_password_hint')}</p>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl px-4 py-3 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-orange-500 hover:bg-orange-400 disabled:opacity-50 disabled:cursor-not-allowed text-black font-black py-3 rounded-xl text-sm tracking-wide transition-colors"
            >
              {loading ? t('set_password_loading') : t('set_password_button')}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}