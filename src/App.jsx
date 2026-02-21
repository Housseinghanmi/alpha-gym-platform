import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import { useLanguage } from './context/LanguageContext'
import Login from './Login'
import AddMember from './AddMember'
import Sidebar from './Sidebar'
import AdminPanel from './AdminPanel'
import SetPassword from './SetPassword'
import LanguageSwitcher from './components/LanguageSwitcher'

function App() {
  const { t } = useLanguage()
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeView, setActiveView] = useState(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    const getUserProfile = async (user) => {
      const { data } = await supabase
        .from('profiles')
        .select('role, first_login')
        .eq('id', user.id)
        .single()

      if (data) {
        setProfile(data)
        if (!data.first_login) {
          if (data.role === 'admin') setActiveView('manage-owners')
          else if (data.role === 'owner') setActiveView('add-member')
          else if (data.role === 'coach') setActiveView('my-clients')
        }
      }
      setLoading(false)
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) getUserProfile(session.user)
      else setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) getUserProfile(session.user)
      else {
        setProfile(null)
        setActiveView(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleLogout = () => supabase.auth.signOut()

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="text-orange-500 text-4xl font-black tracking-tighter mb-2">ALPHA GYM</div>
          <div className="text-zinc-500 text-sm tracking-widest uppercase animate-pulse">{t('loading')}</div>
        </div>
      </div>
    )
  }

  if (!session) return <Login />

  // First login — force password setup
  if (profile?.first_login) {
    return (
      <SetPassword
        userId={session.user.id}
        onComplete={() => setProfile(p => ({ ...p, first_login: false }))}
      />
    )
  }

  const role = profile?.role

  const viewTitles = {
    'manage-owners': t('view_manage_owners'),
    'add-member': t('view_add_member'),
    'all-members': t('view_all_members'),
    'coaches': t('view_coaches'),
    'my-clients': t('view_my_clients'),
  }

  const roleLabel = {
    admin: t('role_admin'),
    owner: t('role_owner'),
    coach: t('role_coach'),
  }

  const renderView = () => {
    switch (activeView) {
      case 'manage-owners': return <AdminPanel />
      case 'add-member': return <AddMember />
      case 'all-members':
      case 'coaches':
      case 'my-clients':
        return (
          <div className="p-8 border-2 border-dashed border-zinc-800 rounded-xl text-center text-zinc-500">
            {viewTitles[activeView]} — {t('coming_next')}
          </div>
        )
      default: return null
    }
  }

  return (
    <div className="min-h-screen bg-black text-white flex overflow-hidden">
      <Sidebar
        role={role}
        activeView={activeView}
        onNavigate={setActiveView}
        onLogout={handleLogout}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <main className="flex-1 flex flex-col min-h-screen min-w-0">
        <header className="border-b border-zinc-800 px-4 md:px-8 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden flex flex-col gap-1.5 p-1.5 text-zinc-400 hover:text-white transition-colors shrink-0"
            >
              <span className="block w-5 h-0.5 bg-current" />
              <span className="block w-5 h-0.5 bg-current" />
              <span className="block w-5 h-0.5 bg-current" />
            </button>
            <div className="min-w-0">
              <h1 className="text-base md:text-xl font-black text-white tracking-tight truncate">
                {viewTitles[activeView] || 'Dashboard'}
              </h1>
              <p className="text-xs text-zinc-500 uppercase tracking-widest hidden sm:block">
                {roleLabel[role]}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 md:gap-3 shrink-0">
            <LanguageSwitcher />
            <span className="text-xs bg-zinc-900 border border-zinc-800 px-2 md:px-3 py-1.5 rounded-lg text-orange-500 font-mono uppercase tracking-widest">
              {role}
            </span>
          </div>
        </header>

        <div className="flex-1 p-4 md:p-8">
          {renderView()}
        </div>
      </main>
    </div>
  )
}

export default App