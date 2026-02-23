import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import { useLanguage } from './context/LanguageContext'

export default function CoachDashboard() {
  const { t } = useLanguage()
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.rpc('get_my_clients')
      setClients(data || [])
      setLoading(false)
    }
    fetch()
  }, [])

  const getStatus = (endDate) => {
    if (!endDate) return { label: 'expired', days: 0 }
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const end = new Date(endDate); end.setHours(0, 0, 0, 0)
    const daysLeft = Math.ceil((end - today) / (1000 * 60 * 60 * 24))
    if (daysLeft < 0) return { label: 'expired', days: daysLeft }
    if (daysLeft <= 7) return { label: 'expiring', days: daysLeft }
    return { label: 'active', days: daysLeft }
  }

  const statusStyles = {
    active: 'bg-green-500/10 border border-green-500/30 text-green-500',
    expiring: 'bg-yellow-500/10 border border-yellow-500/30 text-yellow-500',
    expired: 'bg-red-500/10 border border-red-500/30 text-red-400',
  }

  if (loading) return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse">
      {[...Array(3)].map((_, i) => <div key={i} className="h-32 bg-gray-100 dark:bg-zinc-900 rounded-2xl" />)}
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="bg-orange-500/10 border border-orange-500/20 rounded-2xl px-5 py-4">
          <p className="text-gray-400 dark:text-zinc-500 text-[10px] uppercase tracking-widest mb-1">{t('kpi_total_members')}</p>
          <p className="text-3xl font-black text-orange-500">{clients.length}</p>
        </div>
        <div className="bg-green-500/10 border border-green-500/20 rounded-2xl px-5 py-4">
          <p className="text-gray-400 dark:text-zinc-500 text-[10px] uppercase tracking-widest mb-1">{t('kpi_active')}</p>
          <p className="text-3xl font-black text-green-500">
            {clients.filter(c => getStatus(c.membership_end).label === 'active').length}
          </p>
        </div>
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-2xl px-5 py-4">
          <p className="text-gray-400 dark:text-zinc-500 text-[10px] uppercase tracking-widest mb-1">{t('kpi_expiring')}</p>
          <p className="text-3xl font-black text-yellow-500">
            {clients.filter(c => getStatus(c.membership_end).label === 'expiring').length}
          </p>
        </div>
      </div>

      {clients.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-zinc-900/50 rounded-2xl border-2 border-dashed border-gray-200 dark:border-zinc-800 text-gray-400 dark:text-zinc-500 text-sm">
          {t('clients_empty')}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {clients.map(client => {
            const { label, days } = getStatus(client.membership_end)
            return (
              <div key={client.id} className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl p-5 space-y-3 hover:border-orange-500/40 transition-all">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center font-black text-lg shrink-0 overflow-hidden">
                    {client.avatar_url
                      ? <img src={client.avatar_url} alt="" className="w-full h-full object-cover" />
                      : client.member_name?.charAt(0)?.toUpperCase()
                    }
                  </div>
                  <div className="min-w-0">
                    <p className="text-gray-900 dark:text-white font-bold truncate">{client.member_name}</p>
                    <p className="text-gray-400 dark:text-zinc-500 text-xs">{client.member_phone || '—'}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 dark:text-zinc-500 text-xs">{client.discipline || '—'}</span>
                  <span className={`text-[10px] uppercase px-2 py-0.5 rounded-full font-bold border ${statusStyles[label]}`}>
                    {t(`status_${label}`)}
                  </span>
                </div>
                <div className="text-xs text-gray-400 dark:text-zinc-500 border-t border-gray-100 dark:border-zinc-800 pt-2">
                  {client.membership_end} · {days >= 0 ? `${days} ${t('days_left')}` : `${Math.abs(days)}d ${t('days_ago')}`}
                </div>
                {client.bio && (
                  <p className="text-xs text-gray-500 dark:text-zinc-400 leading-relaxed line-clamp-2">{client.bio}</p>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}