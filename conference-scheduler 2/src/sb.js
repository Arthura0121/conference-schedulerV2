import {createClient} from '@supabase/supabase-js'
const url=import.meta.env.VITE_SUPABASE_URL,key=import.meta.env.VITE_SUPABASE_ANON_KEY
export const configured=Boolean(url&&key&&!/YOUR-/.test(url+key))
export const sb=createClient(configured?url:'https://not-configured.invalid',configured?key:'not-configured')
export const call=async(f,a)=>{const{data,error}=await sb.rpc(f,a);if(error)throw error;return data}
