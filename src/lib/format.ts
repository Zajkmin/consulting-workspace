import type {AppData,Initiative,Task} from "@/types";
export const formatDate=(d:string)=>new Intl.DateTimeFormat("es-PY",{day:"2-digit",month:"short"}).format(new Date(`${d}T12:00:00`));
export const minutesBetween=(a:string,b:string)=>{const[ah,am]=a.split(":").map(Number),[bh,bm]=b.split(":").map(Number);return bh*60+bm-ah*60-am};
export const durationLabel=(m:number)=>m>=60?`${Math.floor(m/60)} h${m%60?` ${m%60} min`:""}`:`${m} min`;
export const versionProgress=(id:string,d:AppData)=>{const t=d.tasks.filter(x=>x.versionId===id);return t.length?Math.round(t.reduce((a,x)=>a+x.progress,0)/t.length):0};
export const initiativeProgress=(i:Initiative,d:AppData)=>{const v=d.versions.filter(x=>x.initiativeId===i.id);return v.length?Math.round(v.reduce((a,x)=>a+versionProgress(x.id,d),0)/v.length):0};
export const projectStats=(id:string,t:Task[])=>{const l=t.filter(x=>x.projectId===id);return{completed:l.filter(x=>x.status==="Completada").length,pending:l.filter(x=>!["Completada","Retrasada"].includes(x.status)).length,late:l.filter(x=>x.status==="Retrasada").length}};
