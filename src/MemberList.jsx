import { useState, useEffect, useMemo } from 'react'
import { supabase } from './supabaseClient'
import { useLanguage } from './context/LanguageContext'

// --- Helpers ---
const getStatus = (endDate) => {
  if (!endDate) return { label: 'expired', days: 0 }
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);
  
  const diffTime = end - today;
  const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (daysLeft < 0) return { label: 'expired', days: daysLeft };
  if (daysLeft <= 7) return { label: 'expiring', days: daysLeft };
  return { label: 'active', days: daysLeft };
}

const StatusBadge = ({ endDate }) => {
  const { t } = useLanguage()
  const { label } = getStatus(endDate)
  const styles = {
    active: 'bg-green-500/10 border border-green-500/30 text-green-400',
    expiring: 'bg-yellow-500/10 border border-yellow-500/30 text-yellow-400',
    expired: 'bg-red-500/10 border border-red-500/30 text-red-400',
  }
  return (
    <span className={`text-[10px] uppercase px-2 py-0.5 rounded-full font-bold whitespace-nowrap ${styles[label]}`}>
      {t(`status_${label}`)}
    </span>
  )
}

const DISCIPLINES = ['Bodybuilding', 'CrossFit', 'Taekwondo', 'Boxing', 'Yoga', 'Pilates', 'Swimming', 'Cycling', 'MMA', 'Other']

export default function MemberList() {
  const { t } = useLanguage()
  const [members, setMembers] = useState([])
  const [coaches, setCoaches] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('members')
  const [editingMember, setEditingMember] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')

  const fetchInitialData = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: gym } = await supabase
        .from('gyms')
        .select('id')
        .eq('owner_id', user.id)
        .single()

      const [membersRes, coachesRes] = await Promise.all([
        supabase
          .from('members')
          .select('*, coach:coach_id(id, full_name)')
          .eq('owner_id', user.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('profiles')
          .select('id, full_name, phone')
          .eq('role', 'coach')
          .eq('gym_id', gym?.id)
      ])

      setMembers(membersRes.data || [])
      setCoaches(coachesRes.data || [])
    } catch (error) {
      console.error("Error fetching data:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchInitialData() }, [])

  const handleDelete = async (id) => {
    const { error } = await supabase.from('members').delete().eq('id', id)
    if (!error) {
      setDeleteConfirm(null)
      fetchInitialData()
    }
  }

  const handleSave = async () => {
    setSaving(true)
    const { error } = await supabase
      .from('members')
      .update({
        full_name: editingMember.full_name,
        phone: editingMember.phone,
        membership_start: editingMember.membership_start,
        membership_end: editingMember.membership_end,
        coach_id: editingMember.coach_id || null,
        discipline: editingMember.discipline,
      })
      .eq('id', editingMember.id)

    if (!error) {
      setEditingMember(null)
      fetchInitialData()
    }
    setSaving(false)
  }

  const filteredMembers = useMemo(() => {
    return members.filter(m => {
      const searchStr = search.toLowerCase()
      const matchSearch = 
        m.full_name?.toLowerCase().includes(searchStr) ||
        m.phone?.includes(search) ||
        m.discipline?.toLowerCase().includes(searchStr)
      
      const statusLabel = getStatus(m.membership_end).label
      const matchStatus = filterStatus === 'all' || statusLabel === filterStatus
      
      return matchSearch && matchStatus
    })
  }, [members, search, filterStatus])

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex gap-4 border-b border-zinc-800">
        {['members', 'coaches'].map((tab) => (
          <button
            key={tab}
            onClick={() => { setActiveTab(tab); setSearch(''); }}
            className={`pb-4 text-sm font-bold transition-all border-b-2 px-2 ${
              activeTab === tab ? 'border-orange-500 text-orange-500' : 'border-transparent text-zinc-500 hover:text-white'
            }`}
          >
            {tab === 'members' ? t('nav_all_members') : t('nav_coaches')}
          </button>
        ))}
      </div>

      {activeTab === 'members' ? (
        <>
          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4">
            <input
              type="text"
              placeholder={t('members_search')}
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm focus:border-orange-500 transition-all outline-none"
            />
            <div className="flex bg-zinc-900 p-1 rounded-xl border border-zinc-800">
              {['all', 'active', 'expiring', 'expired'].map(s => (
                <button
                  key={s}
                  onClick={() => setFilterStatus(s)}
                  className={`px-4 py-1.5 rounded-lg text-[10px] uppercase font-bold transition-all ${
                    filterStatus === s ? 'bg-orange-500 text-black' : 'text-zinc-500 hover:text-white'
                  }`}
                >
                  {t(`status_${s}`)}
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          {loading ? (
            <div className="text-center py-10 text-zinc-600 animate-pulse">{t('loading')}</div>
          ) : filteredMembers.length === 0 ? (
            <div className="text-center py-20 bg-zinc-900/50 rounded-2xl border-2 border-dashed border-zinc-800 text-zinc-500">
              {t('members_empty')}
            </div>
          ) : (
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-zinc-950/50 text-zinc-500 text-[10px] uppercase tracking-tighter font-black">
                    <tr>
                      <th className="px-6 py-4">{t('col_name')}</th>
                      <th className="px-6 py-4">{t('col_discipline')}</th>
                      <th className="px-6 py-4">{t('col_end')}</th>
                      <th className="px-6 py-4">{t('col_coach')}</th>
                      <th className="px-6 py-4">{t('col_status')}</th>
                      <th className="px-6 py-4 text-right">ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/50 text-sm">
                    {filteredMembers.map((member) => (
                      <tr key={member.id} className="hover:bg-zinc-800/30 transition-colors">
                        <td className="px-6 py-4 font-medium text-white">
                          {member.full_name}
                          <div className="text-[10px] text-zinc-500 font-normal">{member.phone}</div>
                        </td>
                        <td className="px-6 py-4 text-zinc-400">{member.discipline || '—'}</td>
                        <td className="px-6 py-4 text-zinc-400">
                           {member.membership_end}
                           <div className="text-[10px] text-zinc-600">
                             {getStatus(member.membership_end).days}j restant(s)
                           </div>
                        </td>
                        <td className="px-6 py-4 text-zinc-400">{member.coach?.full_name || '—'}</td>
                        <td className="px-6 py-4"><StatusBadge endDate={member.membership_end} /></td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-3">
                            <button onClick={() => setEditingMember(member)} className="hover:text-orange-500 transition-colors">✏️</button>
                            <button onClick={() => setDeleteConfirm(member.id)} className="hover:text-red-500 transition-colors">🗑️</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      ) : (
        /* Coaches Tab */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            <div className="col-span-full text-center py-10 text-zinc-600 animate-pulse">{t('loading')}</div>
          ) : coaches.length === 0 ? (
            <div className="col-span-full text-center py-10 text-zinc-600">{t('coaches_empty')}</div>
          ) : (
            coaches.map(coach => (
              <div key={coach.id} className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl flex justify-between items-center transition-all hover:border-orange-500/50">
                <div>
                  <h4 className="text-white font-bold">{coach.full_name}</h4>
                  <p className="text-zinc-500 text-xs mt-1">{coach.phone || '—'}</p>
                </div>
                <div className="h-10 w-10 bg-orange-500/10 text-orange-500 rounded-full flex items-center justify-center font-black">
                  {coach.full_name?.charAt(0)}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Edit Modal */}
      {editingMember && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-md space-y-4">
            <h3 className="text-white font-bold text-lg">{t('edit_member_title')}</h3>
            <div className="space-y-3">
              <input 
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-white outline-none focus:border-orange-500"
                value={editingMember.full_name || ''} 
                onChange={e => setEditingMember({...editingMember, full_name: e.target.value})}
                placeholder={t('col_name')}
              />
              <input 
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-white outline-none focus:border-orange-500"
                value={editingMember.phone || ''} 
                onChange={e => setEditingMember({...editingMember, phone: e.target.value})}
                placeholder={t('col_phone')}
              />
              <div className="grid grid-cols-2 gap-3">
                <input 
                  type="date"
                  className="bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-white outline-none focus:border-orange-500"
                  value={editingMember.membership_start || ''} 
                  onChange={e => setEditingMember({...editingMember, membership_start: e.target.value})}
                />
                <input 
                  type="date"
                  className="bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-white outline-none focus:border-orange-500"
                  value={editingMember.membership_end || ''} 
                  onChange={e => setEditingMember({...editingMember, membership_end: e.target.value})}
                />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button 
                onClick={handleSave}
                disabled={saving}
                className="flex-1 bg-orange-500 text-black font-bold py-2 rounded-lg hover:bg-orange-400 transition-colors disabled:opacity-50"
              >
                {saving ? t('saving') : t('action_save')}
              </button>
              <button 
                onClick={() => setEditingMember(null)}
                className="flex-1 bg-zinc-800 text-white py-2 rounded-lg hover:bg-zinc-700 transition-colors"
              >
                {t('action_cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-sm text-center">
            <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">⚠️</div>
            <h3 className="text-white font-bold text-lg mb-2">{t('delete_confirm_title')}</h3>
            <p className="text-zinc-500 text-sm mb-6">{t('delete_confirm_subtitle')}</p>
            <div className="flex gap-3">
              <button 
                onClick={() => handleDelete(deleteConfirm)}
                className="flex-1 bg-red-500 text-white font-bold py-2 rounded-lg hover:bg-red-400 transition-colors"
              >
                {t('action_delete')}
              </button>
              <button 
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 bg-zinc-800 text-white py-2 rounded-lg hover:bg-zinc-700 transition-colors"
              >
                {t('action_cancel')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}