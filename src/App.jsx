import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import { useLanguage } from './context/LanguageContext'
import Login from './Login'
import AddMember from './AddMember'
import MemberList from './MemberList'
import CoachesList from './CoachesList'
import OwnerDashboard from './OwnerDashboard'
import ProfilePage from './ProfilePage'
import Sidebar from './Sidebar'
import AdminPanel from './AdminPanel'
import SetPassword from './SetPassword'
import LanguageSwitcher from './components/LanguageSwitcher'
import ThemeToggle from './components/ThemeToggle'

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
        .select('role, first_login, full_name, avatar_url')
        .eq('id', user.id)
        .single()

      if (data) {
        setProfile(data)
        if (!data.first_login) {
          if (data.role === 'admin') setActiveView('manage-owners')
          else if (data.role === 'owner') setActiveView('dashboard')
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
      else { setProfile(null); setActiveView(null); setLoading(false) }
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleLogout = () => supabase.auth.signOut()

  if (loading) return (
    <div className="min-h-screen bg-gray-50 dark:bg-black flex items-center justify-center">
      <div className="text-center">
        <div className="text-orange-500 text-4xl font-black tracking-tighter mb-2">ALPHA GYM</div>
        <div className="text-gray-400 dark:text-zinc-500 text-sm tracking-widest uppercase animate-pulse">{t('loading')}</div>
      </div>
    </div>
  )

  if (!session) return <Login />

  if (profile?.first_login) return (
    <SetPassword userId={session.user.id}
      onComplete={() => setProfile(p => ({ ...p, first_login: false }))} />
  )

  const role = profile?.role

  const viewTitles = {
    'manage-owners': t('view_manage_owners'),
    'dashboard': t('view_dashboard'),
    'add-member': t('view_add_member'),
    'all-members': t('view_all_members'),
    'coaches': t('view_coaches'),
    'my-clients': t('view_my_clients'),
    'profile': t('view_profile'),
  }

  const roleLabel = { admin: t('role_admin'), owner: t('role_owner'), coach: t('role_coach') }

  const renderView = () => {
    switch (activeView) {
      case 'manage-owners': return <AdminPanel />
      case 'dashboard': return <OwnerDashboard />
      case 'add-member': return <AddMember />
      case 'all-members': return <MemberList />
      case 'coaches': return <CoachesList />
      case 'profile': return <ProfilePage />
      case 'my-clients': return (
        <div className="p-8 border-2 border-dashed border-gray-200 dark:border-zinc-800 rounded-xl text-center text-gray-400 dark:text-zinc-500">
          {viewTitles['my-clients']} — {t('coming_next')}
        </div>
      )
      default: return null
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black text-gray-900 dark:text-white flex overflow-hidden">
      <Sidebar role={role} activeView={activeView} onNavigate={setActiveView}
        onLogout={handleLogout} isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)}
        profile={profile} />

      <main className="flex-1 flex flex-col min-h-screen min-w-0">
        <header className="border-b border-gray-200 dark:border-zinc-800 bg-white dark:bg-black px-4 md:px-8 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => setSidebarOpen(true)}
              className="md:hidden flex flex-col gap-1.5 p-1.5 text-gray-400 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white transition-colors shrink-0">
              <span className="block w-5 h-0.5 bg-current" />
              <span className="block w-5 h-0.5 bg-current" />
              <span className="block w-5 h-0.5 bg-current" />
            </button>
            <div className="min-w-0">
              <h1 className="text-base md:text-xl font-black text-gray-900 dark:text-white tracking-tight truncate">
                {viewTitles[activeView] || 'Dashboard'}
              </h1>
              <p className="text-xs text-gray-400 dark:text-zinc-500 uppercase tracking-widest hidden sm:block">
                {roleLabel[role]}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 md:gap-3 shrink-0">
            <ThemeToggle />
            <LanguageSwitcher />
            <button onClick={() => setActiveView('profile')}
              className="w-8 h-8 rounded-lg bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-500 font-black text-sm overflow-hidden">
              {profile?.avatar_url
                ? <img src={profile.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                : profile?.full_name?.[0]?.toUpperCase() || '?'
              }
            </button>
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