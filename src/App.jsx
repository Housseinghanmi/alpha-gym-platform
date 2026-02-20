import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import { useLanguage } from './context/LanguageContext'
import Login from './Login'
import AddMember from './AddMember'
import Sidebar from './Sidebar'
import AdminPanel from './AdminPanel'
import LanguageSwitcher from './components/LanguageSwitcher'

function App() {
  const { t } = useLanguage()
  const [session, setSession] = useState(null)
  const [role, setRole] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeView, setActiveView] = useState(null)

  useEffect(() => {
    const getUserRole = async (user) => {
      const { data } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (data) {
        setRole(data.role)
        if (data.role === 'admin') setActiveView('manage-owners')
        else if (data.role === 'owner') setActiveView('add-member')
        else if (data.role === 'coach') setActiveView('my-clients')
      }
      setLoading(false)
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) getUserRole(session.user)
      else setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) getUserRole(session.user)
      else {
        setRole(null)
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
    <div className="min-h-screen bg-black text-white flex">
      <Sidebar
        role={role}
        activeView={activeView}
        onNavigate={setActiveView}
        onLogout={handleLogout}
      />

      <main className="flex-1 flex flex-col min-h-screen">
        <header className="border-b border-zinc-800 px-8 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black text-white tracking-tight">
              {viewTitles[activeView] || 'Dashboard'}
            </h1>
            <p className="text-xs text-zinc-500 mt-0.5 uppercase tracking-widest">
              {roleLabel[role]}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <span className="text-xs bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-lg text-orange-500 font-mono uppercase tracking-widest">
              {role}
            </span>
          </div>
        </header>

        <div className="flex-1 p-8">
          {renderView()}
        </div>
      </main>
    </div>
  )
}

export default App