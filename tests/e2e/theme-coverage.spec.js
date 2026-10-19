import {test,expect} from '@playwright/test'

// Deterministic browser smoke test. Never uses real Supabase credentials or
// student records. Each browser request stays within the in-memory fixture.
const date=new Date(Date.now()+14*86400000)
const dateKey=date.toLocaleDateString('en-CA',{timeZone:'America/New_York'})
const start=dateKey+'T15:46:00Z',end=dateKey+'T15:56:00Z'
const slot={id:'demo-slot',slot_date:dateKey,period:3,start_at:start,end_at:end,room:'407',state:'open',available:true,draft:false,reason:null,booked:false,held:false}
const themes=['aurora','fall','halloween','winter']
const settings=theme=>({theme,public_roster:true,tz:'America/New_York',locked:false,lock_message:'Back soon',policy:'Bring your draft.',auto_lock_on_edit:false,lock_from:null,lock_until:null,edit_lock_until:null})
const stats={total:1,open:1,unavailable:0,booked:0,held:0,drafts:0,upcoming_open:1,upcoming_booked:0,bookings_7d:0}

function json(route,data,status=200){
 return route.fulfill({status,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify(data)})
}
const jwtPart=x=>Buffer.from(JSON.stringify(x)).toString('base64url')
const token=[jwtPart({alg:'HS256',typ:'JWT'}),jwtPart({iss:'ui-test',aud:'authenticated',role:'authenticated',exp:Math.floor(Date.now()/1000)+3600,sub:'00000000-0000-4000-8000-000000000001'}),'signature'].join('.')
const session={access_token:token,token_type:'bearer',expires_in:3600,refresh_token:'test-refresh',user:{id:'00000000-0000-4000-8000-000000000001',aud:'authenticated',role:'authenticated',email:'teacher@example.com',created_at:new Date().toISOString(),app_metadata:{provider:'email',providers:['email']},user_metadata:{},identities:[]}}

async function mockBackend(page,theme,{locked=false}={}){
 let teacher=false, booked=null
 await page.route('**/auth/v1/**',route=>{
  const url=route.request().url(),method=route.request().method()
  if(url.includes('/token')&&method==='POST'){teacher=true;return json(route,session)}
  if(url.includes('/signup')&&method==='POST')return json(route,session)
  if(url.includes('/user'))return json(route,session.user)
  if(url.includes('/logout'))return json(route,{})
  return json(route,{})
 })
 await page.route('**/rest/v1/rpc/**',route=>{
  const rpc=decodeURIComponent(route.request().url().split('/rpc/')[1]?.split('?')[0]||'')
  const data={
   public_state:()=>({locked,message:locked?'Teacher is editing':'Back soon',tz:'America/New_York',theme,policy:'Bring your draft.',roster_on:true,next_change:null}),
   list_slots:()=>[booked?{...slot,state:'booked',mine:true}:slot],my_booking:()=>booked?[booked]:[],list_roster:()=>[{slot_date:dateKey,start_at:start,room:'407',period:3,display_name:'Casey',name_hidden:false}],
   hold_slot:()=>new Date(Date.now()+15000).toISOString(),
   confirm_booking:()=>{booked={slot_id:slot.id,start_at:start,end_at:end,slot_date:dateKey,period:3,room:'407',student_name:'Sample Student',assignment:'Sample Draft',roster_consent:false};return null},
   release_my_hold:()=>null,
   cancel_my_booking:()=>{booked=null;return null},
   admin_check:()=>teacher,
   admin_settings:()=>settings(theme),admin_stats:()=>stats,
   admin_activity:()=>[],admin_events:()=>[],
   admin_slots:()=>[slot],admin_bookings:()=>[],
  }
  if(data[rpc])return json(route,data[rpc]())
  // Destructive mutation is never exercised by visual smoke tests.
  return json(route,{message:'Unexpected UI fixture request: '+rpc},400)
 })
}
async function noOverflow(page){
 const width=await page.evaluate(()=>({window:window.innerWidth,root:document.documentElement.scrollWidth}))
 expect(width.root,'horizontal document overflow: '+JSON.stringify(width)).toBeLessThanOrEqual(width.window+2)
}
for(const theme of themes){
 test('student calendar, times and roster follow '+theme+' world',async({page})=>{
  await mockBackend(page,theme)
  await page.goto('/')
  const app=page.locator('.app[data-theme="'+theme+'"]')
  await expect(app).toBeVisible({timeout:15000})
  await expect(page.locator('.afterdark-cal .cal-title')).toBeVisible()
  await expect(page.locator('.ad-student-roster')).toBeVisible()
  await noOverflow(page)
  const times=page.getByRole('button',{name:'Times',exact:true}).first()
  await times.click()
  await expect(page.locator('.ad-student-list')).toBeVisible()
  await noOverflow(page)
 })
 test('teacher sign-in follows '+theme+' and is usable',async({page})=>{
  await mockBackend(page,theme)
  await page.goto('/#admin')
  await expect(page.locator('.teacher-auth[data-theme="'+theme+'"]')).toBeVisible({timeout:15000})
  await expect(page.getByRole('heading',{name:'Welcome back.'})).toBeVisible()
  await expect(page.getByRole('button',{name:'Sign in to dashboard'})).toBeDisabled()
  await expect(page.getByRole('button',{name:'Show password'})).toBeVisible()
  await noOverflow(page)
  await page.getByRole('textbox',{name:'Email address'}).fill('teacher@example.com')
  await page.getByLabel('Password',{exact:true}).fill('test-password')
  await page.getByRole('button',{name:'Show password'}).click()
  await expect(page.getByRole('button',{name:'Hide password'})).toBeVisible()
 })
 test('teacher Overview, Schedule, Bookings, Settings, Lockdown render in '+theme,async({page})=>{
  await mockBackend(page,theme)
  await page.goto('/#admin')
  await expect(page.getByRole('heading',{name:'Welcome back.'})).toBeVisible({timeout:15000})
  await page.getByRole('textbox',{name:'Email address'}).fill('teacher@example.com')
  await page.getByLabel('Password',{exact:true}).fill('test-password')
  await page.getByRole('button',{name:'Sign in to dashboard'}).click()
  await expect(page.locator('.tapp[data-theme="'+theme+'"]')).toBeVisible({timeout:15000})
  await expect(page.locator('.ad-teacher-overview')).toBeVisible()
  await noOverflow(page)
  for(const [tab,screen] of [['Schedule','.ad-admin-schedule'],['Bookings','.ad-admin-bookingshero'],['Settings','.ad-admin-settings'],['Lockdown','.ad-admin-lockdown']]){
   await page.getByRole('button',{name:tab,exact:true}).first().click()
   await expect(page.locator(screen)).toBeVisible({timeout:12000})
   await noOverflow(page)
  }
 })
}

for(const theme of themes){
 test('student booking form, success and cancellation work in '+theme,async({page})=>{
  await mockBackend(page,theme)
  await page.goto('/')
  await expect(page.locator('.app[data-theme="'+theme+'"]')).toBeVisible({timeout:15000})
  await page.getByRole('button',{name:'Next open',exact:true}).click()
  await expect(page.getByRole('heading',{name:'Make it official.'})).toBeVisible()
  await expect(page.locator('.ad-hold')).toBeVisible()
  await page.getByRole('textbox',{name:'Your full name'}).fill('Sample Student')
  await page.getByRole('textbox',{name:'Writing piece you will revise'}).fill('Sample Draft')
  await page.getByRole('button',{name:'Confirm reservation'}).click()
  await expect(page.getByRole('heading',{name:"You're booked!"})).toBeVisible({timeout:10000})
  await noOverflow(page)
  await page.getByRole('button',{name:'Dismiss'}).click()
  await expect(page.locator('.ad-mybooking')).toBeVisible()
  await page.getByRole('button',{name:'Cancel conference'}).click()
  await expect(page.locator('dialog.sheet')).toBeVisible()
  await expect(page.locator('dialog.sheet')).toHaveAttribute('open','')
  await page.locator('dialog.sheet').getByRole('button',{name:'Cancel conference'}).click()
  await expect(page.locator('.ad-mybooking')).toHaveCount(0,{timeout:10000})
 })
 test('student locked experience stays themed in '+theme,async({page})=>{
  await mockBackend(page,theme,{locked:true})
  await page.goto('/')
  await expect(page.locator('.ad-cosmos[data-theme="'+theme+'"]')).toBeVisible({timeout:15000})
  await expect(page.getByRole('heading',{name:'Teacher is editing'})).toBeVisible()
  await expect(page.getByRole('link',{name:/Teacher portal/i})).toBeVisible()
  await noOverflow(page)
 })
}
