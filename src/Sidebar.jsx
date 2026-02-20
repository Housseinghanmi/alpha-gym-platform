import { useLanguage } from './context/LanguageContext'

export default function Sidebar({ role, activeView, onNavigate, onLogout }) {
  const { t } = useLanguage()

  const navItem = (view, label, icon) => {
    const isActive = activeView === view
    return (
      <button
        key={view}
        onClick={() => onNavigate(view)}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-150 text-left
          ${isActive
            ? 'bg-orange-500 text-black font-bold'
            : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
          }`}
      >
        <span className="text-base">{icon}</span>
        {label}
      </button>
    )
  }

  return (
    <aside className="w-60 min-h-screen bg-zinc-950 border-r border-zinc-800 flex flex-col">
      <div className="px-6 py-6 border-b border-zinc-800">
        <div className="text-orange-500 text-2xl font-black tracking-tighter">ALPHA GYM</div>
        <div className="text-zinc-600 text-xs tracking-widest uppercase mt-0.5">Platform</div>
      </div>

      <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
        {role === 'admin' && (
          <>
            <p className="text-zinc-600 text-xs uppercase tracking-widest px-4 py-2">{t('nav_admin')}</p>
            {navItem('manage-owners', t('nav_manage_owners'), '🏢')}
          </>
        )}

        {role === 'owner' && (
          <>
            <p className="text-zinc-600 text-xs uppercase tracking-widest px-4 py-2">{t('nav_management')}</p>
            {navItem('add-member', t('nav_add_member'), '➕')}
            {navItem('all-members', t('nav_all_members'), '👥')}
            {navItem('coaches', t('nav_coaches'), '🏋️')}
          </>
        )}

        {role === 'coach' && (
          <>
            <p className="text-zinc-600 text-xs uppercase tracking-widest px-4 py-2">{t('nav_coaching')}</p>
            {navItem('my-clients', t('nav_my_clients'), '⚡')}
          </>
        )}
      </nav>

      <div className="px-3 py-4 border-t border-zinc-800">
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-red-500 hover:bg-red-500/10 transition-all duration-150"
        >
          <span>🚪</span>
          {t('nav_logout')}
        </button>
      </div>
    </aside>
  )
}