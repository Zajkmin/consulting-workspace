import type { AppData } from "@/types";
/* eslint-disable @typescript-eslint/no-unused-expressions */
const KEY="consulting-workspace-data-v1";
const SESSION_KEY="consulting-workspace-session-user";
export const localDataStore={load():AppData|null{if(typeof window==="undefined")return null;try{const v=localStorage.getItem(KEY);return v?JSON.parse(v):null}catch{return null}},save(data:AppData){if(typeof window!=="undefined")localStorage.setItem(KEY,JSON.stringify(data))},loadSession(){return typeof window==="undefined"?null:localStorage.getItem(SESSION_KEY)},saveSession(id:string|null){if(typeof window==="undefined")return;id?localStorage.setItem(SESSION_KEY,id):localStorage.removeItem(SESSION_KEY)}};
