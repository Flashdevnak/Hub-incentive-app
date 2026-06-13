'use client';
import { useState } from 'react';
import Link from 'next/link';
import { getDeviceId, Message } from '@/components/ClientTools';
export default function ActivatePage(){
 const [employeeCode,setCode]=useState(''); const [startDate,setDate]=useState(''); const [msg,setMsg]=useState(''); const [type,setType]=useState<'ok'|'danger'|'notice'>('notice');
 async function submit(e:any){e.preventDefault(); const res=await fetch('/api/auth/request-activation',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({employeeCode,startDate,deviceId:getDeviceId(),deviceInfo:navigator.userAgent})}); const j=await res.json(); setMsg(j.message); setType(j.ok?'ok':'danger')}
 return <div className="auth"><div className="card auth-card"><h1>ขอเปิดใช้งานครั้งแรก</h1><p className="muted">กรอกรหัสพนักงานและวันเริ่มงาน ระบบจะส่งคำขอให้หัวหน้า/Admin อนุมัติ</p><Message text={msg} type={type}/><form className="form" onSubmit={submit}><label>รหัสพนักงาน<input value={employeeCode} onChange={e=>setCode(e.target.value)}/></label><label>วันเริ่มงาน<input type="date" value={startDate} onChange={e=>setDate(e.target.value)}/></label><button>ส่งคำขอเปิดใช้งาน</button></form><p><Link href="/login">กลับไปหน้าเข้าสู่ระบบ</Link></p></div></div>
}
