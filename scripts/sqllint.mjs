// SQL lint: every UPDATE and DELETE must have a WHERE (Supabase's API roles load pg_safeupdate and reject the statement with error 21000).
// Works on whole files, including the inside of $$ function bodies. Comments and string literals are ignored. Use "where true" for an intentional bulk change.
export function maskSql(sql){return sql.replace(/--[^\n]*/g,m=>' '.repeat(m.length)).replace(/'(?:[^']|'')*'/g,m=>"'"+m.slice(1,-1).replace(/[^\n]/g,' ')+"'")}
const DML=/\b(update\s+(?:only\s+)?[A-Za-z_][\w."]*(?:\s+(?:as\s+)?[A-Za-z_]\w*)?\s+set\b|delete\s+from\b)/i
export function findUnqualifiedDml(sql){
  const m=maskSql(sql),out=[];let pos=0
  for(const seg of m.split(';')){const d=DML.exec(seg)
    if(d&&!/\bwhere\b/i.test(seg.slice(d.index))){const at=pos+d.index;out.push({line:sql.slice(0,at).split('\n').length,text:sql.slice(at).split('\n')[0].trim().slice(0,90)})}
    pos+=seg.length+1}
  return out}
/** Mirror (in JavaScript) of the catalog query in supabase/tests/verify_functions.sql: split each function BODY on ';' (comments removed, strings kept) and flag pieces that contain update/delete with no later "where", excluding "for update". */
export function catalogMirror(sql){
  const bodies=[...sql.matchAll(/\$\$([\s\S]*?)\$\$/g)].map(x=>x[1]),out=[]
  for(const b of bodies)for(const piece of b.replace(/--[^\n]*/g,'').split(';')){
    if(/\b(update|delete)\b/i.test(piece)&&!/\b(update|delete)\b[\s\S]*\bwhere\b/i.test(piece)&&!/\bfor\s+update\b/i.test(piece))out.push(piece.replace(/\s+/g,' ').trim().slice(0,90))}
  return out}
