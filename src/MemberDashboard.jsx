import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import { useLanguage } from './context/LanguageContext'

export default function MemberDashboard() {
  const { t } = useLanguage()
  const [membership, setMembership] = useState(null)
  const [allCoaches, setAllCoaches] = useState([])
  const [loading, setLoading] = useState(true)
  const [assigning, setAssigning] = useState(false)
  const [assignMessage, setAssignMessage] = useState(null)
  const [activeTab, setActiveTab] = useState('overview')

  const fetchData = async () => {
    setLoading(true)
    const [{ data: m }, { data: c }] = await Promise.all([
      supabase.rpc('get_my_membership'),
      supabase.rpc('get_all_coaches'),
    ])
    setMembership(m)
    setAllCoaches(c || [])
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  const handleAssignCoach = async (coachId) => {
    setAssigning(true)
    setAssignMessage(null)
    const { error } = await supabase.rpc('assign_coach', { p_coach_id: coachId })
    if (error) setAssignMessage({ type: 'error', text: error.message })
    else {
      setAssignMessage({ type: 'success', text: t('coach_assigned') })
      fetchData()
    }
    setAssigning(false)
  }

  const getStatus = (endDate) => {
    if (!endDate) return { label: 'expired', days: 0 }
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const end = new Date(endDate); end.setHours(0, 0, 0, 0)
    const daysLeft = Math.ceil((end - today) / (1000 * 60 * 60 * 24))
    if (daysLeft < 0) return { label: 'expired', days: daysLeft }
    if (daysLeft <= 7) return { label: 'expiring', days: daysLeft }
    return { label: 'active', days: daysLeft }
  }

  const tabClass = (tab) => `pb-4 text-sm font-bold transition-all border-b-2 px-2 ${
    activeTab === tab
      ? 'border-orange-500 text-orange-500'
      : 'border-transparent text-gray-400 dark:text-zinc-500 hover:text-gray-900 dark:hover:text-white'
  }`

  if (loading) return (
    <div className="space-y-4 animate-pulse">
      <div className="h-32 bg-gray-100 dark:bg-zinc-900 rounded-2xl" />
      <div className="h-48 bg-gray-100 dark:bg-zinc-900 rounded-2xl" />
    </div>
  )

  const status = membership ? getStatus(membership.membership_end) : null
  const statusStyles = {
    active: 'bg-green-500/10 border-green-500/30 text-green-500',
    expiring: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-500',
    expired: 'bg-red-500/10 border-red-500/30 text-red-400',
  }

  return (
    <div className="space-y-6 max-w-3xl">

      {/* Tabs */}
      <div className="flex gap-4 border-b border-gray-200 dark:border-zinc-800">
        <button onClick={() => setActiveTab('overview')} className={tabClass('overview')}>
          🏋️ {t('tab_my_membership')}
        </button>
        <button onClick={() => setActiveTab('coaches')} className={tabClass('coaches')}>
          👥 {t('tab_find_coach')} ({allCoaches.length})
        </button>
      </div>

      {/* ── OVERVIEW TAB ── */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          {!membership ? (
            <div className="text-center py-20 bg-white dark:bg-zinc-900/50 rounded-2xl border-2 border-dashed border-gray-200 dark:border-zinc-800 text-gray-400 dark:text-zinc-500 text-sm">
              {t('no_membership')}
            </div>
          ) : (
            <>
              {/* Membership Card */}
              <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-gray-900 dark:text-white font-bold">{t('tab_my_membership')}</h3>
                  {status && (
                    <span className={`text-[10px] uppercase px-3 py-1 rounded-full font-bold border ${statusStyles[status.label]}`}>
                      {t(`status_${status.label}`)}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 dark:bg-zinc-800 rounded-xl p-4">
                    <p className="text-gray-400 dark:text-zinc-500 text-[10px] uppercase tracking-widest mb-1">🏢 {t('gym')}</p>
                    <p className="text-gray-900 dark:text-white font-bold text-sm">{membership.gym_name}</p>
                    <p className="text-gray-400 dark:text-zinc-500 text-xs">{membership.gym_location}</p>
                  </div>
                  <div className="bg-gray-50 dark:bg-zinc-800 rounded-xl p-4">
                    <p className="text-gray-400 dark:text-zinc-500 text-[10px] uppercase tracking-widest mb-1">🏅 {t('col_discipline')}</p>
                    <p className="text-gray-900 dark:text-white font-bold text-sm">{membership.discipline || '—'}</p>
                  </div>
                  <div className="bg-gray-50 dark:bg-zinc-800 rounded-xl p-4">
                    <p className="text-gray-400 dark:text-zinc-500 text-[10px] uppercase tracking-widest mb-1">📅 {t('col_start')}</p>
                    <p className="text-gray-900 dark:text-white font-bold text-sm">{membership.membership_start}</p>
                  </div>
                  <div className="bg-gray-50 dark:bg-zinc-800 rounded-xl p-4">
                    <p className="text-gray-400 dark:text-zinc-500 text-[10px] uppercase tracking-widest mb-1">⏱ {t('col_end')}</p>
                    <p className="text-gray-900 dark:text-white font-bold text-sm">{membership.membership_end}</p>
                    <p className="text-gray-400 dark:text-zinc-500 text-xs">
                      {status.days >= 0 ? `${status.days} ${t('days_left')}` : `${Math.abs(status.days)}d ${t('days_ago')}`}
                    </p>
                  </div>
                </div>
              </div>

              {/* Coach Card */}
              <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl p-6">
                <h3 className="text-gray-900 dark:text-white font-bold mb-4">{t('my_coach')}</h3>
                {!membership.coach_name ? (
                  <div className="text-center py-8 border-2 border-dashed border-gray-200 dark:border-zinc-800 rounded-xl space-y-3">
                    <p className="text-gray-400 dark:text-zinc-500 text-sm">{t('no_coach_assigned')}</p>
                    <button onClick={() => setActiveTab('coaches')}
                      className="bg-orange-500 hover:bg-orange-400 text-black font-bold px-5 py-2 rounded-xl text-sm transition-colors">
                      {t('find_coach')}
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-4 bg-gray-50 dark:bg-zinc-800 rounded-xl p-4">
                    <div className="w-14 h-14 bg-orange-500/10 text-orange-500 rounded-xl flex items-center justify-center font-black text-xl shrink-0 overflow-hidden">
                      {membership.coach_avatar
                        ? <img src={membership.coach_avatar} alt="" className="w-full h-full object-cover" />
                        : membership.coach_name?.charAt(0)?.toUpperCase()
                      }
                    </div>
                    <div>
                      <p className="text-gray-900 dark:text-white font-bold">{membership.coach_name}</p>
                      {membership.coach_phone && <p className="text-gray-400 dark:text-zinc-500 text-sm">{membership.coach_phone}</p>}
                      {membership.coach_bio && <p className="text-gray-500 dark:text-zinc-400 text-xs mt-1 leading-relaxed line-clamp-2">{membership.coach_bio}</p>}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── FIND COACH TAB ── */}
      {activeTab === 'coaches' && (
        <div className="space-y-4">
          {assignMessage && (
            <div className={`rounded-xl px-4 py-3 text-sm font-medium ${
              assignMessage.type === 'success'
                ? 'bg-green-500/10 border border-green-500/30 text-green-500'
                : 'bg-red-500/10 border border-red-500/30 text-red-400'
            }`}>{assignMessage.text}</div>
          )}

          {allCoaches.length === 0 ? (
            <div className="text-center py-20 text-gray-400 dark:text-zinc-500 text-sm">{t('coaches_empty')}</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {allCoaches.map(coach => {
                const isMyCoach = membership?.coach_name === coach.full_name
                return (
                  <div key={coach.id} className={`bg-white dark:bg-zinc-900 border rounded-2xl p-5 space-y-3 transition-all ${isMyCoach ? 'border-orange-500/50' : 'border-gray-200 dark:border-zinc-800 hover:border-orange-500/30'}`}>
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-orange-500/10 text-orange-500 rounded-xl flex items-center justify-center font-black text-xl shrink-0 overflow-hidden">
                        {coach.avatar_url
                          ? <img src={coach.avatar_url} alt="" className="w-full h-full object-cover" />
                          : coach.full_name?.charAt(0)?.toUpperCase()
                        }
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-gray-900 dark:text-white font-bold truncate">{coach.full_name}</p>
                          {isMyCoach && <span className="text-[10px] bg-orange-500/10 border border-orange-500/30 text-orange-500 px-2 py-0.5 rounded-full font-mono shrink-0">{t('my_coach')}</span>}
                        </div>
                        <p className="text-gray-400 dark:text-zinc-500 text-xs">{coach.gym_name} · {coach.gym_location}</p>
                      </div>
                    </div>

                    {coach.bio && (
                      <p className="text-gray-500 dark:text-zinc-400 text-xs leading-relaxed line-clamp-2">{coach.bio}</p>
                    )}

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-gray-400 dark:text-zinc-500 text-xs">
                        👥 {coach.client_count} {t('clients')}
                      </span>
                      {!isMyCoach && (
                        <button
                          onClick={() => handleAssignCoach(coach.id)}
                          disabled={assigning}
                          className="bg-orange-500 hover:bg-orange-400 disabled:opacity-50 text-black font-bold px-4 py-1.5 rounded-lg text-xs transition-colors">
                          {assigning ? '...' : t('assign_coach')}
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}