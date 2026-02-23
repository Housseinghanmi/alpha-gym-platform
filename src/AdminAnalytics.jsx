import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import { useLanguage } from './context/LanguageContext'

export default function AdminAnalytics() {
  const { t } = useLanguage()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetch = async () => {
      const { data: result, error } = await supabase.rpc('get_admin_analytics')
      if (error) setError(error.message)
      else setData(result)
      setLoading(false)
    }
    fetch()
  }, [])

  if (loading) return (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-gray-100 dark:bg-zinc-900 rounded-2xl" />)}
      </div>
    </div>
  )

  if (error) return (
    <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-2xl p-6 text-sm">Error: {error}</div>
  )

  const kpis = [
    { label: t('analytics_total_gyms'), value: data?.total_gyms ?? 0, icon: '🏢', color: 'text-orange-500', bg: 'bg-orange-500/10 border-orange-500/20' },
    { label: t('analytics_total_owners'), value: data?.total_owners ?? 0, icon: '👔', color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20' },
    { label: t('analytics_total_coaches'), value: data?.total_coaches ?? 0, icon: '🏋️', color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
    { label: t('analytics_total_members'), value: data?.total_members ?? 0, icon: '👥', color: 'text-green-500', bg: 'bg-green-500/10 border-green-500/20' },
    { label: t('analytics_total_memberships'), value: data?.total_memberships ?? 0, icon: '🎫', color: 'text-gray-900 dark:text-white', bg: 'bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-800' },
    { label: t('analytics_active'), value: data?.active_memberships ?? 0, icon: '✅', color: 'text-green-500', bg: 'bg-green-500/10 border-green-500/20' },
    { label: t('analytics_expired'), value: data?.expired_memberships ?? 0, icon: '❌', color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' },
  ]

  const gyms = data?.gyms_list || []

  return (
    <div className="space-y-8">

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpis.map((kpi, i) => (
          <div key={i} className={`${kpi.bg} border rounded-2xl p-5`}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-gray-400 dark:text-zinc-500 text-[10px] uppercase tracking-widest">{kpi.label}</p>
              <span className="text-lg">{kpi.icon}</span>
            </div>
            <p className={`text-3xl font-black ${kpi.color}`}>{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Gyms breakdown */}
      <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-zinc-800">
          <h2 className="text-gray-900 dark:text-white font-bold">{t('analytics_gyms_breakdown')}</h2>
        </div>

        {gyms.length === 0 ? (
          <div className="text-center py-16 text-gray-400 dark:text-zinc-500 text-sm">{t('admin_no_owners')}</div>
        ) : (
          <>
            {/* Desktop */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50 dark:bg-zinc-950 text-gray-400 dark:text-zinc-500 text-[10px] uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-4">{t('admin_gym_name')}</th>
                    <th className="px-6 py-4">{t('admin_location')}</th>
                    <th className="px-6 py-4">{t('analytics_owner')}</th>
                    <th className="px-6 py-4">{t('nav_coaches')}</th>
                    <th className="px-6 py-4">{t('nav_all_members')}</th>
                    <th className="px-6 py-4">{t('kpi_active')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-zinc-800 text-sm">
                  {gyms.map(gym => (
                    <tr key={gym.id} className="hover:bg-gray-50 dark:hover:bg-zinc-800/40 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-orange-500/10 text-orange-500 rounded-lg flex items-center justify-center font-black text-sm shrink-0">
                            {gym.name?.charAt(0)?.toUpperCase()}
                          </div>
                          <p className="font-bold text-gray-900 dark:text-white">{gym.name}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-500 dark:text-zinc-400">{gym.location || '—'}</td>
                      <td className="px-6 py-4 text-gray-500 dark:text-zinc-400">{gym.owner_name || '—'}</td>
                      <td className="px-6 py-4">
                        <span className="text-blue-400 font-bold">{gym.coaches_count}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-gray-900 dark:text-white font-bold">{gym.members_count}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-green-500 font-bold">{gym.active_count}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile */}
            <div className="md:hidden divide-y divide-gray-100 dark:divide-zinc-800">
              {gyms.map(gym => (
                <div key={gym.id} className="p-4 space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-orange-500/10 text-orange-500 rounded-xl flex items-center justify-center font-black shrink-0">
                      {gym.name?.charAt(0)?.toUpperCase()}
                    </div>
                    <div>
                      <p className="text-gray-900 dark:text-white font-bold">{gym.name}</p>
                      <p className="text-gray-400 dark:text-zinc-500 text-xs">{gym.location || '—'}</p>
                    </div>
                  </div>
                  <div className="flex gap-4 text-xs">
                    <span className="text-blue-400 font-bold">{gym.coaches_count} coaches</span>
                    <span className="text-gray-900 dark:text-white font-bold">{gym.members_count} members</span>
                    <span className="text-green-500 font-bold">{gym.active_count} active</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}