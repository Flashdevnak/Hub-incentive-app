'use client';
import { useState } from 'react';
import Link from 'next/link';
import { getDeviceId, Message } from '@/components/ClientTools';
export default function SetPinPage(){
 const [employeeCode,setCode]=useState(''); const [pin,setPin]=useState(''); const [confirm,setConfirm]=useState(''); const [msg,setMsg]=useState(''); const [type,setType]=useState<'ok'|'danger'|'notice'>('notice');
 async function submit(e:any){e.preventDefault(); if(pin!==confirm){setType('danger');setMsg('PIN ไม่ตรงกัน');return} const res=await fetch('/api/auth/set-pin',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({employeeCode,pin,deviceId:getDeviceId(),deviceName:navigator.userAgent})}); const j=await res.json(); setMsg(j.message); setType(j.ok?'ok':'danger')}
 return <div className="auth"><div className="card auth-card"><h1>ตั้ง PIN หลังอนุมัติ</h1><p className="muted">ใช้เมนูนี้หลังจากหัวหน้า/Admin อนุมัติคำขอเปิดใช้งานแล้ว</p><Message text={msg} type={type}/><form className="form" onSubmit={submit}><label>รหัสพนักงาน<input value={employeeCode} onChange={e=>setCode(e.target.value)}/></label><label>PIN 6 หลัก<input type="password" inputMode="numeric" value={pin} onChange={e=>setPin(e.target.value)}/></label><label>ยืนยัน PIN<input type="password" inputMode="numeric" value={confirm} onChange={e=>setConfirm(e.target.value)}/></label><button>บันทึก PIN และอุปกรณ์นี้</button></form><p><Link href="/login">กลับไปหน้าเข้าสู่ระบบ</Link></p></div></div>
}
