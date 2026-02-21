import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import { useLanguage } from './context/LanguageContext'

const getStatus = (endDate) => {
  const today = new Date()
  const end = new Date(endDate)
  const daysLeft = Math.ceil((end - today) / (1000 * 60 * 60 * 24))
  if (daysLeft < 0) return { label: 'expired', days: daysLeft }
  if (daysLeft <= 7) return { label: 'expiring', days: daysLeft }
  return { label: 'active', days: daysLeft }
}

const StatusBadge = ({ endDate }) => {
  const { t } = useLanguage()
  const { label, days } = getStatus(endDate)
  const styles = {
    active: 'bg-green-500/10 border border-green-500/30 text-green-400',
    expiring: 'bg-yellow-500/10 border border-yellow-500/30 text-yellow-400',
    expired: 'bg-red-500/10 border border-red-500/30 text-red-400',
  }
  return (
    <span className={`text-xs px-2 py-1 rounded-md font-mono ${styles[label]}`}>
      {t(`status_${label}`)}
    </span>
  )
}

export default function OwnerDashboard() {
  const { t } = useLanguage()
  const [members, setMembers] = useState([])
  const [coaches, setCoaches] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser()

      const [{ data: membersData }, { data: coachesData }] = await Promise.all([
        supabase
          .from('members')
          .select(`*, coach:coach_id(full_name)`)
          .eq('owner_id', user.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('profiles')
          .select('id')
          .eq('role', 'coach')
          .eq('gym_id', (await supabase.from('profiles').select('gym_id').eq('id', user.id).single()).data?.gym_id)
      ])

      setMembers(membersData || [])
      setCoaches(coachesData || [])
      setLoading(false)
    }
    fetchData()
  }, [])

  const totalMembers = members.length
  const activeMembers = members.filter(m => getStatus(m.membership_end).label === 'active').length
  const expiringMembers = members.filter(m => getStatus(m.membership_end).label === 'expiring').length
  const expiredMembers = members.filter(m => getStatus(m.membership_end).label === 'expired').length
  const totalCoaches = coaches.length

  const kpis = [
    { label: t('kpi_total_members'), value: totalMembers, color: 'text-white', bg: 'bg-zinc-800' },
    { label: t('kpi_active'), value: activeMembers, color: 'text-green-400', bg: 'bg-green-500/10 border border-green-500/20' },
    { label: t('kpi_expiring'), value: expiringMembers, color: 'text-yellow-400', bg: 'bg-yellow-500/10 border border-yellow-500/20' },
    { label: t('kpi_expired'), value: expiredMembers, color: 'text-red-400', bg: 'bg-red-500/10 border border-red-500/20' },
    { label: t('kpi_coaches'), value: totalCoaches, color: 'text-orange-400', bg: 'bg-orange-500/10 border border-orange-500/20' },
  ]

  if (loading) return <div className="text-zinc-500 animate-pulse">{t('loading')}</div>

  return (
    <div className="space-y-8">

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {kpis.map((kpi, i) => (
          <div key={i} className={`${kpi.bg} rounded-2xl p-4`}>
            <p className="text-zinc-500 text-xs uppercase tracking-widest mb-2">{kpi.label}</p>
            <p className={`text-3xl font-black ${kpi.color}`}>{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Recent Members */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white">{t('dashboard_recent_members')}</h2>
          <span className="text-xs text-zinc-500">{t('dashboard_last_5')}</span>
        </div>

        {members.length === 0 ? (
          <div className="text-center py-8 border-2 border-dashed border-zinc-800 rounded-xl text-zinc-600 text-sm">
            {t('members_empty')}
          </div>
        ) : (
          <div className="space-y-3">
            {members.slice(0, 5).map(member => {
              const { label, days } = getStatus(member.membership_end)
              return (
                <div key={member.id} className="flex items-center justify-between bg-zinc-800 rounded-xl px-4 py-3 gap-3">
                  <div className="min-w-0">
                    <p className="text-white font-medium text-sm truncate">{member.full_name}</p>
                    <p className="text-zinc-500 text-xs mt-0.5">{member.discipline || '—'}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-zinc-500 text-xs hidden sm:block">
                      {days >= 0 ? `${days}d` : t('status_expired')}
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