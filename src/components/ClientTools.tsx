'use client';
import { useEffect, useState } from 'react';
export function getDeviceId(){
  if (typeof window === 'undefined') return '';
  let id = localStorage.getItem('nak_device_id');
  if (!id) { id = crypto.randomUUID(); localStorage.setItem('nak_device_id', id); }
  return id;
}
export function useApi<T=any>(url: string) {
  const [data,setData]=useState<T|null>(null); const [loading,setLoading]=useState(true); const [error,setError]=useState('');
  useEffect(()=>{ fetch(url).then(r=>r.json()).then(j=>{ if(!j.ok) setError(j.message||'Error'); else setData(j); }).catch(e=>setError(String(e))).finally(()=>setLoading(false)); },[url]);
  return {data,loading,error};
}
export function Message({text,type='notice'}:{text?:string,type?:'notice'|'ok'|'danger'}) { if(!text) return null; return <div className={`notice ${type}`}>{text}</div>; }
