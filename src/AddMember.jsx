import { useState } from 'react'
import { supabase } from './supabaseClient'

export default function AddMember() {
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [endDate, setEndDate] = useState('')

  const handleAdd = async (e) => {
  e.preventDefault();
  
  // 1. Get the current logged-in user's ID
  const { data: { user } } = await supabase.auth.getUser();

  // 2. Insert with the owner_id attached
  const { error } = await supabase
    .from('members')
    .insert([
      { 
        full_name: fullName, 
        phone: phone, 
        membership_end: endDate,
        membership_start: new Date().toISOString().split('T')[0],
        owner_id: user.id // <--- This links the member to the logged-in owner
      }
    ]);

  if (error) {
    alert(error.message);
  } else {
    alert('Member added successfully! 🚀');
    setFullName(''); setPhone(''); setEndDate('');
  }
  };

  return (
    <form onSubmit={handleAdd}>
      <input type="text" placeholder="Full Name" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
      <input type="tel" placeholder="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} required />
      <input type="date" placeholder="End Date" value={endDate} onChange={(e) => setEndDate(e.target.value)} required />
      <button type="submit">Add Member</button>
    </form>
  );
}