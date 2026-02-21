import { useState } from 'react'
import { supabase } from './supabaseClient'
import { useLanguage } from './context/LanguageContext'

const DISCIPLINES = ['Bodybuilding', 'CrossFit', 'Taekwondo', 'Boxing', 'Yoga', 'Pilates', 'Swimming', 'Cycling', 'MMA', 'Other']

export default function AddMember() {
  const { t } = useLanguage()
  const [form, setForm] = useState({ fullName: '', phone: '', endDate: '', discipline: '' })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(null)

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }))

  const handleAdd = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('members').insert([{
      full_name: form.fullName,
      phone: form.phone,
      membership_end: form.endDate,
      membership_start: new Date().toISOString().split('T')[0],
      discipline: form.discipline,
      owner_id: user.id,
    }])
    if (error) setMessage({ type: 'error', text: error.message })
    else {
      setMessage({ type: 'success', text: t('add_success') })
      setForm({ fullName: '', phone: '', endDate: '', discipline: '' })
    }
    setLoading(false)
  }

  const inputClass = "w-full bg-gray-100 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-zinc-600 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-500 transition-colors"

  return (
    <div className="max-w-lg">
      <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl p-6">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-1">{t('add_member_title')}</h2>
        <p className="text-gray-500 dark:text-zinc-500 text-sm mb-6">{t('add_member_subtitle')}</p>

        <form onSubmit={handleAdd} className="space-y-4">
          <div>
            <label className="text-xs text-gray-500 dark:text-zinc-400 uppercase tracking-widest block mb-1.5">{t('add_full_name')}</label>
            <input type="text" placeholder={t('add_full_name_placeholder')} value={form.fullName}
              onChange={set('fullName')} required className={inputClass} />
          </div>

          <div>
            <label className="text-xs text-gray-500 dark:text-zinc-400 uppercase tracking-widest block mb-1.5">{t('add_phone')}</label>
            <input type="tel" placeholder={t('add_phone_placeholder')} value={form.phone}
              onChange={set('phone')} className={inputClass} />
          </div>

          <div>
            <label className="text-xs text-gray-500 dark:text-zinc-400 uppercase tracking-widest block mb-1.5">{t('col_discipline')}</label>
            <select value={form.discipline} onChange={set('discipline')} className={inputClass}>
              <option value="">— {t('select_discipline')} —</option>
              {DISCIPLINES.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>

          <div>
            <label className="text-xs text-gray-500 dark:text-zinc-400 uppercase tracking-widest block mb-1.5">{t('add_membership_end')}</label>
            <input type="date" value={form.endDate} onChange={set('endDate')} required className={inputClass} />
          </div>

          {message && (
            <div className={`rounded-xl px-4 py-3 text-sm font-medium ${
              message.type === 'success'
                ? 'bg-green-500/10 border border-green-500/30 text-green-500'
                : 'bg-red-500/10 border border-red-500/30 text-red-400'
            }`}>{message.text}</div>
          )}

          <button type="submit" disabled={loading}
            className="w-full bg-orange-500 hover:bg-orange-400 disabled:opacity-50 text-black font-bold py-3 rounded-xl text-sm tracking-wide transition-colors">
            {loading ? t('add_loading') : t('add_button')}
          </button>
        </form>
      </div>
    </div>
  )
}