import {useEffect, useState} from 'react';
import {fetchResources, errorMessage, type Resource, type ResourceType} from '../api/campushubApi';
import styles from '../styles.module.css';
export interface ResourceListProps { onSelect: (resource: Resource) => void }
const labels = {ROOM:'Study rooms', EQUIPMENT:'Equipment', LAB:'Labs'};
export function ResourceList({onSelect}: ResourceListProps) {
 const [type,setType]=useState<ResourceType | ''>(''); const [resources,setResources]=useState<Resource[]>([]);
 const [isLoading,setLoading]=useState(true); const [error,setError]=useState(''); const [retry,setRetry]=useState(0);
 useEffect(()=>{const controller=new AbortController(); setLoading(true); setError('');
 fetchResources(type || undefined,controller.signal).then(data=>{if(!controller.signal.aborted)setResources(data)}).catch(e=>{if(!controller.signal.aborted)setError(errorMessage(e))}).finally(()=>{if(!controller.signal.aborted)setLoading(false)});
 return ()=>controller.abort();},[type,retry]);
 return <section><div className={styles.sectionTitle}><div><span className={styles.eyebrow}>FIND YOUR SPACE</span><h2>Explore campus resources</h2></div><span className={styles.muted}>Spaces and tools for your next big idea.</span></div>
 <div className={styles.filters} role="group" aria-label="Filter resource type">{(['','ROOM','EQUIPMENT','LAB'] as const).map(t=><button key={t} aria-pressed={type===t} className={type===t?styles.selected:''} onClick={()=>setType(t)}>{t?labels[t]:'All resources'}</button>)}</div>
 {isLoading?<p role="status">Loading campus resources…</p>:error?<div role="alert" className={styles.error}>{error} <button onClick={()=>setRetry(v=>v+1)}>Try again</button></div>:resources.length===0?<div className={styles.empty}>No resources in this category yet.</div>:<div className={styles.grid}>{resources.map(r=><article key={r.id} className={styles.card}><div className={`${styles.cardArt} ${styles[r.type]}`}><span>{r.type==='ROOM'?'▦':r.type==='LAB'?'⚗':'◉'}</span><small>{labels[r.type]}</small></div><div className={styles.cardBody}><span className={r.isAvailable?styles.available:styles.muted}>{r.isAvailable?'● Available for booking':'● Unavailable'}</span><h3>{r.name}</h3><p className={styles.muted}>⌖ {r.location}</p><button className={styles.book} disabled={!r.isAvailable} onClick={()=>onSelect(r)}>Book resource <span>↗</span></button></div></article>)}</div>}</section>;
}