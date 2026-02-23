import { useLanguage } from './context/LanguageContext'

export default function Sidebar({ role, activeView, onNavigate, onLogout, isOpen, onClose }) {
  const { t } = useLanguage()

  const navItem = (view, label, icon) => {
    const isActive = activeView === view
    return (
      <button key={view} onClick={() => { onNavigate(view); onClose() }}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-150 text-left
          ${isActive
            ? 'bg-orange-500 text-black font-bold'
            : 'text-gray-500 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800 hover:text-gray-900 dark:hover:text-white'
          }`}>
        <span>{icon}</span>
        <span>{label}</span>
      </button>
    )
  }

  const section = (label) => (
    <p className="text-gray-400 dark:text-zinc-600 text-[10px] uppercase tracking-widest px-4 pt-4 pb-1 font-bold">
      {label}
    </p>
  )

  return (
    <>
      {isOpen && <div className="fixed inset-0 bg-black/60 z-20 md:hidden" onClick={onClose} />}

      <aside className={`
        fixed top-0 left-0 h-full z-30 w-64
        bg-white dark:bg-zinc-950
        border-r border-gray-200 dark:border-zinc-800
        flex flex-col
        transition-transform duration-300 ease-in-out
        md:static md:translate-x-0 md:z-auto md:w-60 md:shrink-0
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>

        {/* Logo */}
        <div className="px-6 py-5 border-b border-gray-200 dark:border-zinc-800 flex items-center justify-between">
          <div>
            <div className="text-orange-500 text-2xl font-black tracking-tighter">ALPHA GYM</div>
            <div className="text-gray-400 dark:text-zinc-600 text-[10px] tracking-widest uppercase mt-0.5">Platform</div>
          </div>
          <button onClick={onClose} className="md:hidden text-gray-400 hover:text-gray-900 dark:text-zinc-500 dark:hover:text-white transition-colors">✕</button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-3 flex flex-col overflow-y-auto">

          {role === 'admin' && (
            <>
              {section(t('nav_admin'))}
              {navItem('analytics', t('nav_analytics'), '📈')}
              {navItem('manage-owners', t('nav_manage_owners'), '🏢')}
            </>
          )}

          {role === 'owner' && (
            <>
              {section(t('nav_overview'))}
              {navItem('dashboard', t('nav_dashboard'), '📊')}
              {section(t('nav_management'))}
              {navItem('all-members', t('nav_all_members'), '👥')}
              {navItem('coaches', t('nav_coaches'), '🏋️')}
            </>
          )}

          {role === 'coach' && (
            <>
              {section(t('nav_coaching'))}
              {navItem('my-clients', t('nav_my_clients'), '⚡')}
            </>
          )}

          {role === 'member' && (
            <>
              {section(t('nav_overview'))}
              {navItem('member-home', t('nav_member_home'), '🏠')}
            </>
          )}
        </nav>

        {/* Profile + Logout */}
        <div className="px-3 py-3 border-t border-gray-200 dark:border-zinc-800 space-y-1">
          {navItem('profile', t('nav_profile'), '👤')}
          <button onClick={onLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-500 hover:bg-red-500/10 transition-all duration-150">
            <span>🚪</span>
            <span>{t('nav_logout')}</span>
          </button>
        </div>
      </aside>
    </>
  )
}