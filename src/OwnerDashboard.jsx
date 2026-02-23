import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import { useLanguage } from './context/LanguageContext'

const getStatus = (endDate) => {
  if (!endDate) return { label: 'expired', days: 0 }
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const end = new Date(endDate); end.setHours(0, 0, 0, 0)
  const daysLeft = Math.ceil((end - today) / (1000 * 60 * 60 * 24))
  if (daysLeft < 0) return { label: 'expired', days: daysLeft }
  if (daysLeft <= 7) return { label: 'expiring', days: daysLeft }
  return { label: 'active', days: daysLeft }
}

const StatusBadge = ({ endDate }) => {
  const { t } = useLanguage()
  const { label } = getStatus(endDate)
  const styles = {
    active: 'bg-green-500/10 border border-green-500/30 text-green-500',
    expiring: 'bg-yellow-500/10 border border-yellow-500/30 text-yellow-500',
    expired: 'bg-red-500/10 border border-red-500/30 text-red-400',
  }
  return (
    <span className={`text-[10px] uppercase px-2 py-0.5 rounded-full font-bold border ${styles[label]}`}>
      {t(`status_${label}`)}
    </span>
  )
}

const subTypeLabel = { monthly: '1M', trimester: '3M', '6months': '6M', yearly: '12M' }
const subTypeColor = {
  monthly: 'bg-blue-500/10 border-blue-500/30 text-blue-400',
  trimester: 'bg-purple-500/10 border-purple-500/30 text-purple-400',
  '6months': 'bg-orange-500/10 border-orange-500/30 text-orange-400',
  yearly: 'bg-green-500/10 border-green-500/30 text-green-500',
}

export default function OwnerDashboard() {
  const { t } = useLanguage()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetch = async () => {
      const { data: result, error } = await supabase.rpc('get_owner_dashboard')
      if (error) setError(error.message)
      else setData(result)
      setLoading(false)
    }
    fetch()
  }, [])

  if (loading) return (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => <div key={i} className="h-24 bg-gray-100 dark:bg-zinc-900 rounded-2xl" />)}
      </div>
    </div>
  )

  if (error) return (
    <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-2xl p-6 text-sm">
      Error: {error}
    </div>
  )

  const kpis = [
    { label: t('kpi_total_members'), value: data?.total_members ?? 0, color: 'text-gray-900 dark:text-white', bg: 'bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800' },
    { label: t('kpi_active'), value: data?.active_members ?? 0, color: 'text-green-500', bg: 'bg-green-500/10 border border-green-500/20' },
    { label: t('kpi_expiring'), value: data?.expiring_members ?? 0, color: 'text-yellow-500', bg: 'bg-yellow-500/10 border border-yellow-500/20' },
    { label: t('kpi_expired'), value: data?.expired_members ?? 0, color: 'text-red-400', bg: 'bg-red-500/10 border border-red-500/20' },
    { label: t('kpi_coaches'), value: data?.total_coaches ?? 0, color: 'text-orange-500', bg: 'bg-orange-500/10 border border-orange-500/20' },
    { label: t('kpi_standalone'), value: data?.total_standalone ?? 0, color: 'text-blue-400', bg: 'bg-blue-500/10 border border-blue-500/20' },
  ]

  const recentMembers = data?.recent_members || []
  const estimatedProfit = parseFloat(data?.estimated_next_month ?? 0)

  return (
    <div className="space-y-6">

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {kpis.map((kpi, i) => (
          <div key={i} className={`${kpi.bg} rounded-2xl p-4`}>
            <p className="text-gray-400 dark:text-zinc-500 text-[10px] uppercase tracking-widest mb-2 leading-tight">{kpi.label}</p>
            <p className={`text-3xl font-black ${kpi.color}`}>{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Profit Widget */}
      <div className="bg-gradient-to-br from-orange-500/20 via-orange-500/10 to-transparent border border-orange-500/30 rounded-2xl p-6">
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <p className="text-orange-400 text-[10px] uppercase tracking-widest font-bold mb-1">{t('profit_next_month')}</p>
            <p className="text-gray-900 dark:text-white text-4xl font-black">
              {estimatedProfit.toLocaleString('fr-TN', { minimumFractionDigits: 2 })}
              <span className="text-orange-500 text-xl ml-2">DT</span>
            </p>
            <p className="text-gray-500 dark:text-zinc-400 text-xs mt-2">{t('profit_subtitle')}</p>
          </div>
          <div className="text-4xl opacity-60">📈</div>
        </div>
        <div className="bg-white/50 dark:bg-black/20 rounded-xl px-4 py-3 flex items-center justify-between">
          <p className="text-[10px] text-gray-400 dark:text-zinc-500 uppercase tracking-widest">{t('renewing_next_month')}</p>
          <p className="text-gray-900 dark:text-white font-black text-xl">{data?.renewing_count ?? 0} {t('kpi_total_members').toLowerCase()}</p>
        </div>
        <p className="text-[10px] text-gray-400 dark:text-zinc-500 mt-3 leading-relaxed">{t('profit_logic_note')}</p>
      </div>

      {/* Recent Members */}
      <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-gray-900 dark:text-white font-bold">{t('dashboard_recent_members')}</h2>
          <span className="text-xs text-gray-400 dark:text-zinc-500">{t('dashboard_last_5')}</span>
        </div>

        {recentMembers.length === 0 ? (
          <div className="text-center py-10 border-2 border-dashed border-gray-200 dark:border-zinc-800 rounded-xl text-gray-400 dark:text-zinc-600 text-sm">
            {t('members_empty')}
          </div>
        ) : (
          <div className="space-y-3">
            {recentMembers.map((member, i) => {
              const { days } = getStatus(member.membership_end)
              return (
                <div key={i} className="flex items-center justify-between bg-gray-50 dark:bg-zinc-800 rounded-xl px-4 py-3 gap-3">
                  <div className="min-w-0">
                    <p className="text-gray-900 dark:text-white font-medium text-sm truncate">{member.full_name}</p>
                    <p className="text-gray-400 dark:text-zinc-500 text-xs mt-0.5">{member.discipline || '—'}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {member.subscription_type && (
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${subTypeColor[member.subscription_type]}`}>
                        {subTypeLabel[member.subscription_type]}
                      </span>
                    )}
                    {member.price_paid > 0 && (
                      <span className="text-[10px] text-gray-400 dark:text-zinc-500 hidden sm:block">
                        {member.price_paid} DT
                      </span>
                    )}
                    <span className="text-gray-400 dark:text-zinc-500 text-xs hidden md:block">
                      {days >= 0 ? `${days}d` : `${Math.abs(days)}d ago`}
                    </span>
                    <StatusBadge endDate={member.membership_end} />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}