import { useLanguage } from './context/LanguageContext'

export default function Sidebar({ role, activeView, onNavigate, onLogout, isOpen, onClose, profile }) {
  const { t } = useLanguage()

  const navItem = (view, label, icon) => {
    const isActive = activeView === view
    return (
      <button key={view} onClick={() => { onNavigate(view); onClose() }}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-150 text-left
          ${isActive
            ? 'bg-orange-500 text-black font-bold'
            : 'text-gray-500 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800 hover:text-gray-900 dark:hover:text-white'
          }`}>
        <span className="text-base">{icon}</span>
        {label}
      </button>
    )
  }

  return (
    <>
      {isOpen && <div className="fixed inset-0 bg-black/60 z-20 md:hidden" onClick={onClose} />}

      <aside className={`
        fixed top-0 left-0 h-full z-30 w-64
        bg-white dark:bg-zinc-950
        border-r border-gray-200 dark:border-zinc-800
        flex flex-col
        transition-transform duration-300 ease-in-out
        md:static md:translate-x-0 md:z-auto md:w-60
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Logo */}
        <div className="px-6 py-6 border-b border-gray-200 dark:border-zinc-800 flex items-center justify-between">
          <div>
            <div className="text-orange-500 text-2xl font-black tracking-tighter">ALPHA GYM</div>
            <div className="text-gray-400 dark:text-zinc-600 text-xs tracking-widest uppercase mt-0.5">Platform</div>
          </div>
          <button onClick={onClose} className="md:hidden text-gray-400 dark:text-zinc-500 hover:text-gray-900 dark:hover:text-white transition-colors">✕</button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
          {role === 'admin' && (
            <>
              <p className="text-gray-400 dark:text-zinc-600 text-xs uppercase tracking-widest px-4 py-2">{t('nav_admin')}</p>
              {navItem('manage-owners', t('nav_manage_owners'), '🏢')}
            </>
          )}
          {role === 'owner' && (
            <>
              <p className="text-gray-400 dark:text-zinc-600 text-xs uppercase tracking-widest px-4 py-2">{t('nav_overview')}</p>
              {navItem('dashboard', t('nav_dashboard'), '📊')}
              <p className="text-gray-400 dark:text-zinc-600 text-xs uppercase tracking-widest px-4 py-2 mt-2">{t('nav_management')}</p>
              {navItem('add-member', t('nav_add_member'), '➕')}
              {navItem('all-members', t('nav_all_members'), '👥')}
              {navItem('coaches', t('nav_coaches'), '🏋️')}
            </>
          )}
          {role === 'coach' && (
            <>
              <p className="text-gray-400 dark:text-zinc-600 text-xs uppercase tracking-widest px-4 py-2">{t('nav_coaching')}</p>
              {navItem('my-clients', t('nav_my_clients'), '⚡')}
            </>
          )}
        </nav>

        {/* Profile + Logout */}
        <div className="px-3 py-4 border-t border-gray-200 dark:border-zinc-800 space-y-1">
          {navItem('profile', t('nav_profile'), '👤')}
          <button onClick={onLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-red-500 hover:bg-red-500/10 transition-all duration-150">
            <span>🚪</span>
            {t('nav_logout')}
          </button>
        </div>
      </aside>
    </>
  )
}