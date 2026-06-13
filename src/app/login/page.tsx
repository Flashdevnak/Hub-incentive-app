'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getDeviceId, Message } from '@/components/ClientTools';
export default function LoginPage(){
  const router=useRouter(); const [employeeCode,setCode]=useState(''); const [pin,setPin]=useState(''); const [msg,setMsg]=useState(''); const [danger,setDanger]=useState(false);
  async function submit(e:any){ e.preventDefault(); setMsg(''); const res=await fetch('/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({employeeCode,pin,deviceId:getDeviceId(),deviceName:navigator.userAgent})}); const j=await res.json(); if(j.ok){router.push('/dashboard')}else{setDanger(true);setMsg(j.message)}}
  return <div className="auth"><div className="card auth-card"><h1>เข้าสู่ระบบ</h1><p className="muted">ระบบตรวจสอบ Incentive พนักงาน</p><Message text={msg} type={danger?'danger':'notice'}/><form className="form" onSubmit={submit}><label>รหัสพนักงาน<input value={employeeCode} onChange={e=>setCode(e.target.value)} placeholder="เช่น 6600123 หรือ ADMIN"/></label><label>PIN 6 หลัก<input value={pin} onChange={e=>setPin(e.target.value)} placeholder="******" type="password" inputMode="numeric"/></label><button>เข้าสู่ระบบ</button></form><div className="actions" style={{marginTop:12}}><Link className="btn btn-secondary" href="/activate">ขอเปิดใช้งานครั้งแรก</Link><Link className="btn btn-secondary" href="/set-pin">ตั้ง PIN หลังอนุมัติ</Link></div><p className="small muted">หมายเหตุ: รหัสพนักงานใช้ยืนยันตัวตนร่วมกับ PIN และอุปกรณ์ที่ได้รับอนุมัติเท่านั้น</p></div></div>
}
