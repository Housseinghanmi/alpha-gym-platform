import { useState } from 'react'
import { supabase } from './supabaseClient'
import { useLanguage } from './context/LanguageContext'
import LanguageSwitcher from './components/LanguageSwitcher'
import gymImage from './assets/gym.jpg'

export default function Login() {
  const { t } = useLanguage()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-black flex flex-col md:flex-row">

      {/* Left Panel — Branding + Background Image */}
      <div className="hidden md:flex md:w-1/2 relative flex-col justify-between p-12 overflow-hidden">

        {/* Background image */}
        <img
          src={gymImage}
          alt="Gym"
          className="absolute inset-0 w-full h-full object-cover"
        />

        {/* Dark gradient overlay — heavier at bottom where text sits */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-black/30" />

        {/* Orange accent line at top */}
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-orange-500" />

        {/* Content sits above the overlay */}
        <div className="relative z-10 flex items-center justify-between">
          <div>
            <div className="text-orange-500 text-3xl font-black tracking-tighter">ALPHA GYM</div>
            <div className="text-zinc-400 text-xs tracking-widest uppercase mt-1">Platform</div>
          </div>
          <LanguageSwitcher />
        </div>

        <div className="relative z-10">
          <p className="text-white text-4xl font-black leading-tight tracking-tight drop-shadow-lg">
            {t('login_tagline_1')}<br />
            <span className="text-orange-500">{t('login_tagline_2')}</span>
          </p>
          <p className="text-zinc-300 mt-4 text-sm leading-relaxed max-w-xs drop-shadow">
            {t('login_description')}
          </p>
        </div>

        <div className="relative z-10 flex gap-6 text-zinc-400 text-xs uppercase tracking-widest">
          <span>Members</span>
          <span>Coaches</span>
          <span>Analytics</span>
        </div>
      </div>

      {/* Right Panel — Login Form */}
      <div className="flex-1 flex flex-col justify-center items-center px-6 py-12 md:px-16">

        {/* Mobile Header */}
        <div className="md:hidden w-full max-w-sm flex items-center justify-between mb-10">
          <div>
            <div className="text-orange-500 text-2xl font-black tracking-tighter">ALPHA GYM</div>
            <div className="text-zinc-600 text-xs tracking-widest uppercase mt-0.5">Platform</div>
          </div>
          <LanguageSwitcher />
        </div>

        <div className="w-full max-w-sm">
          <h2 className="text-white text-2xl font-black tracking-tight mb-1">{t('login_welcome')}</h2>
          <p className="text-zinc-500 text-sm mb-8">{t('login_subtitle')}</p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-xs text-zinc-400 uppercase tracking-widest block mb-1.5">
                {t('login_email')}
              </label>
              <input
                type="email"
                placeholder={t('login_email_placeholder')}
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full bg-zinc-900 border border-zinc-800 text-white placeholder-zinc-600 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-500 transition-colors"
              />
            </div>

            <div>
              <label className="text-xs text-zinc-400 uppercase tracking-widest block mb-1.5">
                {t('login_password')}
              </label>
              <input
                type="password"
                placeholder={t('login_password_placeholder')}
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className="w-full bg-zinc-900 border border-zinc-800 text-white placeholder-zinc-600 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-500 transition-colors"
              />
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl px-4 py-3 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-orange-500 hover:bg-orange-400 disabled:opacity-50 disabled:cursor-not-allowed text-black font-black py-3 rounded-xl text-sm tracking-wide transition-colors mt-2"
            >
              {loading ? t('login_loading') : t('login_button')}
            </button>
          </form>

          <p className="text-zinc-600 text-xs text-center mt-8">{t('login_no_access')}</p>
        </div>
      </div>

    </div>
  )
}