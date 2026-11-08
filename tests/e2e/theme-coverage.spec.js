import {test,expect} from '@playwright/test'
import {THEME_IDS as themes} from '../../src/themes.js'
import {ARCADE_GAMES} from '../../src/student/arcade.js'

// Deterministic browser smoke test. Never uses real Supabase credentials or
// student records. Each browser request stays within the in-memory fixture.
const date=new Date(Date.now()+14*86400000)
const dateKey=date.toLocaleDateString('en-CA',{timeZone:'America/New_York'})
const start=dateKey+'T15:46:00Z',end=dateKey+'T15:56:00Z'
const slot={id:'demo-slot',slot_date:dateKey,period:3,start_at:start,end_at:end,room:'407',state:'open',available:true,draft:false,reason:null,booked:false,held:false}
const settings=theme=>({theme,public_roster:true,tz:'America/New_York',locked:false,lock_message:'Back soon',policy:'Bring your draft.',auto_lock_on_edit:false,lock_from:null,lock_until:null,edit_lock_until:null})
const stats={total:1,open:1,unavailable:0,booked:0,held:0,drafts:0,upcoming_open:1,upcoming_booked:0,bookings_7d:0}

function json(route,data,status=200){
 return route.fulfill({status,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify(data)})
}
const jwtPart=x=>Buffer.from(JSON.stringify(x)).toString('base64url')
const token=[jwtPart({alg:'HS256',typ:'JWT'}),jwtPart({iss:'ui-test',aud:'authenticated',role:'authenticated',exp:Math.floor(Date.now()/1000)+3600,sub:'00000000-0000-4000-8000-000000000001'}),'signature'].join('.')
const session={access_token:token,token_type:'bearer',expires_in:3600,refresh_token:'test-refresh',user:{id:'00000000-0000-4000-8000-000000000001',aud:'authenticated',role:'authenticated',email:'teacher@example.com',created_at:new Date().toISOString(),app_metadata:{provider:'email',providers:['email']},user_metadata:{},identities:[]}}

async function mockBackend(page,theme,{locked=false,manyPeriods=false,lockSchedule=[],now=Date.now}={}){
 let teacher=false, booked=null, manual=false, manualUntil=null
 let [lockFrom=null,lockUntil=null]=lockSchedule
 let recurring={}
 const requests=[]
 const lockState=()=>{
  const time=now(), timestamp=value=>value ? Date.parse(value) : null
  const start=timestamp(lockFrom), end=timestamp(lockUntil), immediateEnd=timestamp(manualUntil)
  const oneTimeActive=start!==null && start<=time && (end===null || end>time)
  const manualActive=manual && (immediateEnd===null || immediateEnd>time)
  const active=locked || manualActive || oneTimeActive
  const next=[start,end,immediateEnd].filter(value=>value!==null && value>time).sort((a,b)=>a-b)[0]
  return {active,manualActive,expired:end!==null && end<=time,next:next ? new Date(next).toISOString() : null}
 }

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
  const access=lockState()
  const data={
   public_state:()=>({locked:access.active,message:access.active?'Teacher is editing':'Back soon',tz:'America/New_York',theme,policy:'Bring your draft.',roster_on:true,next_change:access.next}),
   list_slots:()=>manyPeriods?Array.from({length:9},(_,i)=>({...slot,id:'demo-period-'+(i+1),period:i+1})): [booked?{...slot,state:'booked',mine:true}:slot],my_booking:()=>booked?[booked]:[],list_roster:()=>[{slot_date:dateKey,start_at:start,room:'407',period:3,display_name:'Casey',name_hidden:false}],
   hold_slot:()=>new Date(Date.now()+15000).toISOString(),
   confirm_booking:()=>{booked={slot_id:slot.id,start_at:start,end_at:end,slot_date:dateKey,period:3,room:'407',student_name:'Sample Student',assignment:'Sample Draft',roster_consent:false};return null},
   release_my_hold:()=>null,
   cancel_my_booking:()=>{booked=null;return null},
   admin_check:()=>teacher,
   admin_settings:()=>({...settings(theme),...recurring,locked:access.manualActive,lock_active:access.active,
    manual_lock_until:access.manualActive?manualUntil:null,lock_from:access.expired?null:lockFrom,lock_until:access.expired?null:lockUntil,
    next_lock_change:access.next}),admin_stats:()=>stats,
   admin_set_manual_lock:()=>{
    const args=route.request().postDataJSON()
    requests.push([rpc,args])
    manual=args.p_locked
    manualUntil=args.p_until
    return null
   },
   admin_set_lock_schedule:()=>{
    const args=route.request().postDataJSON()
    requests.push([rpc,args])
    lockFrom=args.p_from
    lockUntil=args.p_until
    return null
   },
   admin_set_recurring_lock:()=>{
    const args=route.request().postDataJSON()
    requests.push([rpc,args])
    recurring={recurring_start:args.p_start,recurring_end:args.p_end,recurring_unit:args.p_unit,recurring_every:args.p_every}
    return null
   },
   admin_set_theme:()=>{
    if(!teacher)throw new Error('Theme updates require a signed-in teacher')
    theme=route.request().postDataJSON().p_theme
    return null
   },
   admin_activity:()=>[],admin_events:()=>[],
   admin_slots:()=>[slot],admin_bookings:()=>[],
  }
  if(data[rpc])return json(route,data[rpc]())
  // Unknown operations are never allowed to reach a real backend.
  return json(route,{message:'Unexpected UI fixture request: '+rpc},400)
 })
 return requests
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
  await expect(page.locator('.teacher-auth .brand-wordmark svg')).toHaveCount(0)
  await expect(page.locator('.teacher-auth .brand-wordmark')).toContainText('English')
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
 test('student locked experience and control effect stay themed in '+theme,async({page},testInfo)=>{
  await mockBackend(page,theme,{locked:true})
  await page.goto('/')
  await expect(page.locator('.ad-cosmos[data-theme="'+theme+'"]')).toBeVisible({timeout:15000})
  await expect(page.getByRole('heading',{name:'Teacher is editing'})).toBeVisible()
  await expect(page.getByRole('link',{name:/Teacher portal/i})).toBeVisible()
  if(theme.startsWith('studio-'))await expect(page.locator('.studio-scene[data-theme="'+theme+'"]')).toBeVisible()
  const launch=page.getByRole('button',{name:'Play '+ARCADE_GAMES[theme].name})
  if(testInfo.project.name==='phone')await launch.tap()
  else await launch.click()
  await expect(launch).toHaveAttribute('data-surface-release','')
  await expect(launch.locator(':scope > theme-surface')).toHaveCSS('pointer-events','none')
  await expect(page.locator('.scene-signature')).toBeVisible()
  await expect(page.getByRole('dialog',{name:ARCADE_GAMES[theme].name+' arcade'})).toBeVisible()
  await noOverflow(page)
 })
}


/* Loading screen and compact-viewport sidebar regression matrix.
   All data is intercepted by the same in-memory fixture above. */
for(const theme of themes){
 test('the student and teacher loading screens are visually '+theme+', never a legacy blue card',async({page})=>{
  await page.addInitScript(value=>localStorage.setItem('conference_site_theme',value),theme)
  await mockBackend(page,theme)
  // Delay the response just long enough to inspect the genuine React loading state.
  await page.route('**/rest/v1/rpc/public_state',async route=>{
   await new Promise(resolve=>setTimeout(resolve,2000))
   await json(route,{locked:false,message:'Back soon',tz:'America/New_York',theme,policy:'Bring your draft.',roster_on:true,next_change:null})
  })
  await page.goto('/',{waitUntil:'domcontentloaded'})
  const status=page.locator('.site-status[data-theme="'+theme+'"]')
  await expect(status).toBeVisible()
  await expect(status.locator('.site-status-card')).toBeVisible()
  await expect(status.locator('.brand-wordmark')).toContainText('English')
  await expect(status.locator('.brand-wordmark svg')).toHaveCount(0)
  await expect(status.locator('.site-status-progress')).toBeVisible()
  const variables=await status.evaluate(el=>{
   const css=getComputedStyle(el)
   return ['--loading-surface','--loading-accent','--loading-ink'].map(k=>css.getPropertyValue(k).trim())
  })
  expect(variables.every(Boolean),'seasonal loading tokens must be resolved').toBeTruthy()
  await noOverflow(page)

  // Restart with a delayed teacher authorization check to inspect teacher loading.
  await page.unroute('**/rest/v1/rpc/public_state')
  await page.route('**/rest/v1/rpc/admin_check',async route=>{
   await new Promise(resolve=>setTimeout(resolve,2000))
   await json(route,false)
  })
  await page.goto('/#admin',{waitUntil:'domcontentloaded'})
  const loginLoading=page.locator('.teacher-auth[data-theme="'+theme+'"] .teacher-auth-loading')
  await expect(loginLoading).toBeVisible()
  await expect(loginLoading.locator('.teacher-loading-emblem')).toBeVisible()
  await expect(loginLoading.locator('.brand-wordmark svg')).toHaveCount(0)
  await expect(loginLoading.locator('.brand-wordmark')).toContainText('English')
  const box=await loginLoading.boundingBox()
  expect(box.width).toBeLessThanOrEqual(page.viewportSize().width)
  await noOverflow(page)
 })
}

async function assertRailFits(page,root,selector){
 const rail=page.locator(root),dock=rail.locator(selector),controls=dock.locator('nav button,.rail-tools button,.rail-tools a,.trail-tools button,.trail-tools a')
 await expect(dock).toBeVisible()
 const dimensions=await dock.evaluate(el=>({scroll:el.scrollHeight,client:el.clientHeight,width:el.clientWidth,scrollWidth:el.scrollWidth}))
 expect(dimensions.width).toBeGreaterThan(45)
 expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.width+2)
 for(let i=0;i<await controls.count();i++){
  const control=controls.nth(i)
  await control.scrollIntoViewIfNeeded()
  const [itemRect,dockRect]=await Promise.all([control.boundingBox(),dock.boundingBox()])
  expect(itemRect,'sidebar control '+i+' has no visible rect').toBeTruthy()
  expect(itemRect.x).toBeGreaterThanOrEqual(dockRect.x-2)
  expect(itemRect.x+itemRect.width).toBeLessThanOrEqual(dockRect.x+dockRect.width+2)
  expect(itemRect.y).toBeGreaterThanOrEqual(dockRect.y-3)
  expect(itemRect.y+itemRect.height).toBeLessThanOrEqual(dockRect.y+dockRect.height+3)
 }
}
for(const theme of themes){
 test('desktop student and teacher rails contain every control at varied heights in '+theme,async({page},testInfo)=>{
  test.skip(testInfo.project.name==='phone','desktop sidebar is intentionally replaced by bottom navigation on phones')
  await mockBackend(page,theme)
  await page.goto('/')
  await expect(page.locator('.app.wide[data-theme="'+theme+'"]')).toBeVisible()
  for(const height of [800,500,340]){
   await page.setViewportSize({width:1280,height})
   await assertRailFits(page,'.app.wide>.rail','.rail-dock')
  }
  await page.setViewportSize({width:1280,height:800})
  await page.goto('/#admin')
  await expect(page.getByRole('heading',{name:'Welcome back.'})).toBeVisible()
  await page.getByRole('textbox',{name:'Email address'}).fill('teacher@example.com')
  await page.getByLabel('Password',{exact:true}).fill('test-password')
  await page.getByRole('button',{name:'Sign in to dashboard'}).click()
  await expect(page.locator('.tapp.wide[data-theme="'+theme+'"]')).toBeVisible()
  for(const height of [800,500,340]){
   await page.setViewportSize({width:1280,height})
   await assertRailFits(page,'.tapp.wide>.trail','.trail-dock')
  }
  await noOverflow(page)
 })
}


/* v4.1 mobile sweep: true narrow phones, common sizes, short landscape, and
   tablet breakpoints. Tests use the same safe in-memory fixture, never live data. */
test('mobile student controls, horizontal period rail and live counter fit without clipping',async({page})=>{
 await mockBackend(page,'winter',{manyPeriods:true})
 for(const viewport of [{width:320,height:700},{width:375,height:812},{width:430,height:932},{width:768,height:900},{width:844,height:390}]){
  await page.setViewportSize(viewport)
  await page.goto('/')
  await expect(page.locator('.app:not(.wide)')).toBeVisible({timeout:15000})
  await expect(page.locator('.mobile-top-eyebrow')).toContainText('ENGLISH CONFERENCES')
  await expect(page.locator('.visitor-counter')).toBeVisible()
  // The viewport matrix retains localStorage: return to Calendar before checking the grid.
  await page.getByRole('button',{name:'Calendar',exact:true}).first().click()
  await expect(page.locator('.afterdark-cal')).toBeVisible()
  await noOverflow(page)
  const nav=page.locator('.app>.bnav')
  await expect(nav).toBeVisible()
  for(const target of await nav.locator('button,a').all()){
   const box=await target.boundingBox()
   expect(box,'mobile bottom navigation item lacks a hit area').toBeTruthy()
   expect(box.height,'bottom nav button too short').toBeGreaterThanOrEqual(43)
  }
  const rail=page.locator('.student-period-chips')
  const size=await rail.evaluate(el=>({client:el.clientWidth,scroll:el.scrollWidth,display:getComputedStyle(el).display}))
  expect(size.scroll,'period rail must be scrollable if there are nine periods').toBeGreaterThan(size.client)
  if(viewport.width <= 430 && viewport.height > viewport.width)expect(size.display).toBe('flex')
  await page.locator('.student-period-chip').last().scrollIntoViewIfNeeded()
  await page.locator('.student-period-chip').last().click()
  await expect(page.locator('.student-period-chip').last()).toHaveAttribute('aria-pressed','true')
  await page.getByRole('button',{name:'Times',exact:true}).first().click()
  await expect(page.locator('.ad-student-list')).toBeVisible()
  await noOverflow(page)
 }
})

test('mobile teacher login, all five tabs and controls remain reachable at narrow widths',async({page})=>{
 await mockBackend(page,'halloween')
 await page.setViewportSize({width:320,height:700})
 await page.goto('/#admin')
 await expect(page.locator('.teacher-auth')).toBeVisible({timeout:15000})
 await expect(page.getByRole('heading',{name:'Welcome back.'})).toBeVisible()
 await expect(page.locator('.visitor-counter')).toBeVisible()
 await noOverflow(page)
 await page.getByRole('textbox',{name:'Email address'}).fill('teacher@example.com')
 await page.getByLabel('Password',{exact:true}).fill('test-password')
 await page.getByRole('button',{name:'Sign in to dashboard'}).click()
 await expect(page.locator('.tapp:not(.wide)')).toBeVisible({timeout:15000})
 for(const viewport of [{width:320,height:700},{width:390,height:844},{width:667,height:375},{width:844,height:390},{width:768,height:900}]){
  await page.setViewportSize(viewport)
  const nav=page.locator('.tapp>.bnav.five')
  await expect(nav).toBeVisible()
  await expect(nav.locator('button')).toHaveCount(5)
  const badge=await page.locator('.visitor-counter').boundingBox()
  const workspace=await page.locator('.tapp>.tmain').boundingBox()
  const navBounds=await nav.boundingBox()
  expect(badge.y,'viewer badge must stay below teacher controls').toBeGreaterThanOrEqual(workspace.y+workspace.height-2)
  expect(badge.y+badge.height,'viewer badge must stay above navigation').toBeLessThanOrEqual(navBounds.y+2)
  for(const button of await nav.locator('button').all()){
   const box=await button.boundingBox()
   expect(box,'teacher nav control must have a visible hitbox').toBeTruthy()
   expect(box.width).toBeGreaterThan(38)
   expect(box.height).toBeGreaterThanOrEqual(43)
  }
  for(const [tab,selector] of [['Overview','.ad-teacher-overview'],['Schedule','.ad-admin-schedule'],['Bookings','.ad-admin-bookingshero'],['Settings','.ad-admin-settings'],['Lockdown','.ad-admin-lockdown']]){
   await nav.getByRole('button',{name:tab,exact:true}).click()
   await expect(page.locator(selector)).toBeVisible({timeout:10000})
   await noOverflow(page)
   if(tab==='Schedule' && [320,667].includes(viewport.width)){
    const slot=page.locator('.srow-wrap').first()
    await slot.getByRole('checkbox').check()
    const actions=page.getByRole('region',{name:'Selected appointments actions'})
    await expect(actions).toBeVisible()
    await page.locator('.tmain').evaluate(el=>{el.scrollTop=el.scrollHeight})
    const [item,bar]=await Promise.all([slot.boundingBox(),actions.boundingBox()])
    expect(item.y+item.height,'the slot can scroll clear of bulk actions').toBeLessThanOrEqual(bar.y)
    await actions.getByRole('button',{name:'Clear selection'}).click()
   }
  }
 }
})

test('locked student view keeps themed footer, teacher link, and global count on 320px mobile',async({page})=>{
 await mockBackend(page,'fall',{locked:true})
 await page.setViewportSize({width:320,height:700})
 await page.goto('/')
 await expect(page.locator('.ad-cosmos[data-theme="fall"]')).toBeVisible({timeout:15000})
 await expect(page.locator('.cosmos-footer-links a[href="#admin"]')).toBeVisible()
 await expect(page.locator('.visitor-counter')).toBeVisible()
 await noOverflow(page)
})

test('responsive viewer badge and calendar remain readable across device sizes',async({page},testInfo)=>{
 test.skip(testInfo.project.name!=='desktop','matrix covers each viewport explicitly')
 await page.emulateMedia({reducedMotion:'reduce'})
 await mockBackend(page,'aurora')
 for(const viewport of [{width:320,height:700},{width:390,height:844},{width:768,height:1024},{width:1024,height:768},{width:1440,height:900},{width:844,height:390}]){
  await page.setViewportSize(viewport)
  await page.goto('/')
  await expect(page.locator('.app')).toBeVisible()
  await expect(page.locator('.visitor-counter')).toContainText('viewing now')
  await noOverflow(page)
  const badge=await page.locator('.visitor-counter').boundingBox()
  expect(badge.x).toBeGreaterThanOrEqual(0)
  expect(badge.x+badge.width).toBeLessThanOrEqual(viewport.width)
  expect(badge.y+badge.height).toBeLessThanOrEqual(viewport.height)
  if(viewport.width<1000){
   const nav=await page.locator('.app>.bnav').boundingBox()
   expect(badge.y+badge.height).toBeLessThanOrEqual(nav.y)
   const workspace=await page.locator('.app>.work').boundingBox()
   expect(badge.y,'viewer badge must not cover scrolling content').toBeGreaterThanOrEqual(workspace.y+workspace.height-2)
   await expect(page.locator('.work-head .live-badge')).toBeHidden()
  }
  if(viewport.width>=1000){
   const panel=await page.locator('.app>.panel').boundingBox()
   expect(badge.y,'viewer badge must stay below the desktop detail panel').toBeGreaterThanOrEqual(panel.y+panel.height-2)
  }
  if(viewport.width===768){
   const calendar=await page.locator('.afterdark-cal').boundingBox()
   const nav=await page.locator('.app>.bnav').boundingBox()
   expect(calendar.y+calendar.height,'tablet month should fit above navigation').toBeLessThanOrEqual(nav.y)
  }
  await page.screenshot({path:testInfo.outputPath(`student-${viewport.width}.png`)})
 }
})

test('a teacher can select Thanksgiving for students and the harvest scene respects reduced motion',async({page},testInfo)=>{
 await mockBackend(page,'fall')
 await page.goto('/#admin')
 await page.getByRole('textbox',{name:'Email address'}).fill('teacher@example.com')
 await page.getByLabel('Password',{exact:true}).fill('test-password')
 await page.getByRole('button',{name:'Sign in to dashboard'}).click()
 await page.getByRole('button',{name:'Settings',exact:true}).first().click()
 const choice=page.getByRole('radio',{name:/^Thanksgiving/})
 await expect(choice).toHaveAttribute('aria-checked','false')
 const save=page.waitForRequest('**/rest/v1/rpc/admin_set_theme')
 await choice.click()
 expect((await save).postDataJSON()).toEqual({p_theme:'thanksgiving'})
 await expect(choice).toHaveAttribute('aria-checked','true')
 await expect(page.locator('.tapp[data-theme="thanksgiving"] .theme-scene-thanksgiving')).toBeVisible()

 await page.goto('/')
 const scene=page.locator('.app[data-theme="thanksgiving"] .theme-scene-thanksgiving')
 await expect(scene).toBeVisible()
 await expect(scene.locator('.harvest-turkey')).toBeVisible()
 await expect(scene.locator('.harvest-lantern')).toBeVisible()
 await expect(scene.locator('.harvest-leaves svg').first()).toHaveCSS('animation-name','harvest-leaf')
 await page.locator('.afterdark-cal').evaluate(el => Promise.all(
  el.getAnimations({subtree:true}).filter(animation=>animation.effect.getTiming().iterations!==Infinity)
   .map(animation=>animation.finished.catch(()=>{}))
 ))
 await page.screenshot({path:testInfo.outputPath('thanksgiving-student.png')})
 await page.emulateMedia({reducedMotion:'reduce'})
 await expect(scene.locator('.harvest-leaves svg').first()).toHaveCSS('animation-name','none')
 await expect(scene.locator('.harvest-turkey')).toBeVisible()
})

test('one-time expiry clears its form while manual and recurring locks remain independent',async({page})=>{
 const base=new Date('2026-11-07T18:00:00Z').getTime()
 let time=base
 await page.clock.install({time:new Date(base)})
 const requestLog=await mockBackend(page,'firefly',{now:()=>time,lockSchedule:[new Date(base-3600000).toISOString(),new Date(base+60000).toISOString()]})
 await page.goto('/#admin')
 await page.getByRole('textbox',{name:'Email address'}).fill('teacher@example.com')
 await page.getByLabel('Password',{exact:true}).fill('test-password')
 await page.getByRole('button',{name:'Sign in to dashboard'}).click()
 await page.getByRole('button',{name:'Lockdown',exact:true}).first().click()
 const scheduleStart=page.getByLabel('Scheduled lock starts',{exact:true})
 await expect(scheduleStart).not.toHaveValue('')
 await expect(page.getByRole('heading',{name:'Student site is locked'})).toBeVisible()
 time+=63000
 await page.clock.fastForward(63000)
 await expect(scheduleStart).toHaveValue('')
 await expect(page.getByRole('heading',{name:'Student site is open'})).toBeVisible()

 await page.getByRole('button',{name:'Lock now',exact:true}).click()
 await page.getByRole('dialog').getByRole('button',{name:'Lock now',exact:true}).click()
 await expect(page.getByRole('heading',{name:'Student site is locked'})).toBeVisible()
 expect(requestLog[0]).toEqual(['admin_set_manual_lock',{p_locked:true,p_msg:'Back soon',p_until:null}])

 await scheduleStart.fill('2026-11-09T17:00')
 await page.getByLabel('Scheduled reopen time (optional)',{exact:true}).fill('2026-11-09T18:00')
 await page.getByRole('button',{name:'Save one-time schedule'}).click()
 await expect(page.getByRole('button',{name:'Clear one-time schedule'})).toBeVisible()
 await page.getByLabel('First recurring lock starts').fill('2026-11-12T17:00')
 await page.getByLabel('First recurring lock reopens').fill('2026-11-12T18:00')
 await page.getByLabel('Repeat every').fill('2')
 await page.getByLabel('Repeat unit').selectOption('month')
 await page.getByRole('button',{name:'Save recurring schedule'}).click()
 await expect(page.getByRole('button',{name:'Clear recurring schedule'})).toBeVisible()
 expect(requestLog.at(-1)).toEqual(['admin_set_recurring_lock',{p_msg:'Back soon',p_start:'2026-11-12T17:00',p_end:'2026-11-12T18:00',p_unit:'month',p_every:2}])
 await expect(scheduleStart).toHaveValue('2026-11-09T17:00')
 await page.getByRole('button',{name:'End manual lock'}).click()
 await expect(page.getByRole('heading',{name:'Student site is open'})).toBeVisible()
 await expect(scheduleStart).toHaveValue('2026-11-09T17:00')
 await expect(page.getByLabel('First recurring lock starts')).toHaveValue('2026-11-12T17:00')
 await noOverflow(page)
})

test('the arcade works with stationary touch targets, keyboard shortcuts and replay',async({page},testInfo)=>{
 const phone=testInfo.project.name==='phone'
 await page.emulateMedia({reducedMotion:'reduce'})
 if(phone)await page.setViewportSize({width:320,height:700})
 else await page.setViewportSize({width:844,height:390})
 await page.clock.install()
 await mockBackend(page,'blossom',{locked:true})
 await page.goto('/')
 await page.getByRole('button',{name:'Play Petal Pursuit'}).click()
 const arcade=page.getByRole('dialog',{name:'Petal Pursuit arcade'})
 await arcade.getByRole('button',{name:'Start game'}).click()
 const pad=arcade.getByRole('button',{name:'Catch blossom'})
 const box=await pad.boundingBox()
 expect(box.width).toBeGreaterThanOrEqual(44)
 expect(box.height).toBeGreaterThanOrEqual(44)
 if(phone)await pad.tap()
 else await pad.click()
 await expect(arcade.locator('[data-score]')).toHaveText('100')
 await page.clock.runFor(2800)
 const key=await pad.locator('.arcade-key').textContent()
 await page.keyboard.press(key)
 await expect(arcade.locator('[data-score]')).toHaveText('250')
 await page.clock.runFor(2800)
 await arcade.getByRole('button',{name:'Avoid raindrop'}).click()
 await expect(arcade.getByText('Combo reset')).toBeVisible()
 for(let i=0;i<10;i++)await page.clock.runFor(2800)
 await expect(arcade.getByText('Round complete!')).toBeVisible()
 await arcade.getByRole('button',{name:'Play again'}).click()
 await expect(arcade.locator('[data-score]')).toHaveText('0')
 await page.keyboard.press('Escape')
 await expect(arcade).toBeHidden()
 await expect(page.getByRole('button',{name:'Play Petal Pursuit'})).toBeFocused()
 await noOverflow(page)
})

test('real controls track pointer, touch and keyboard on their own clipped surface',async({page},testInfo)=>{
 await mockBackend(page,'studio-snowday',{locked:true})
 await page.goto('/')
 const launch=page.getByRole('button',{name:'Play Sled Sprint'})
 const surface=launch.locator(':scope > theme-surface')
 await launch.waitFor()
 await launch.evaluate(async el=>{
  await document.fonts.ready
  const entrance=el.closest('main').getAnimations().find(animation=>animation.animationName==='enter')
  if(entrance) await entrance.finished
 })
 const box=await launch.boundingBox()
 const touch=testInfo.project.name==='phone'
 if(!touch){
  await page.mouse.move(box.x+box.width*.2,box.y+box.height*.5)
  await expect(launch).toHaveAttribute('data-surface-hover','')
  await expect.poll(()=>launch.evaluate(el=>parseFloat(el.style.getPropertyValue('--surface-x')))).toBeLessThan(30)
  const beforePress=await launch.boundingBox()
  await page.mouse.down()
  await expect(launch).toHaveAttribute('data-surface-press','mouse')
  await page.mouse.move(box.x+box.width*.8,box.y+box.height*.5)
  await expect.poll(()=>launch.evaluate(el=>parseFloat(el.style.getPropertyValue('--surface-x')))).toBeGreaterThan(70)
  await expect.poll(()=>surface.evaluate(el=>getComputedStyle(el,'::before').backgroundImage)).toMatch(/at 8\d(?:\.\d+)?%/)
  await expect(surface.locator('i').first()).toHaveCSS('animation-name','surface-frost')
  const pressed=await launch.boundingBox()
  for(const key of ['x','y','width','height']) expect(Math.abs(pressed[key]-beforePress[key])).toBeLessThan(1)
  await page.mouse.up()
 } else {
  await launch.tap({position:{x:box.width*.72,y:box.height*.55}})
  await expect.poll(()=>launch.evaluate(el=>parseFloat(el.style.getPropertyValue('--surface-x')))).toBeGreaterThan(65)
 }
 await expect(launch).toHaveAttribute('data-surface-release','')
 const arcade=page.getByRole('dialog',{name:'Sled Sprint arcade'})
 const relaxed=arcade.getByRole('button',{name:'Relaxed'})
 await relaxed.focus()
 await page.keyboard.down('Space')
 await expect(relaxed).toHaveAttribute('data-surface-press','keyboard')
 await expect(relaxed.locator(':scope > theme-surface')).toHaveCSS('overflow','hidden')
 await page.keyboard.up('Space')
 await page.emulateMedia({reducedMotion:'reduce'})
 await page.keyboard.down('Space')
 await expect(relaxed).toHaveAttribute('data-surface-press','keyboard')
 await expect(relaxed.locator('theme-surface i').first()).toHaveCSS('animation-name','none')
 await page.keyboard.up('Space')
 await expect(arcade.getByRole('button',{name:'Start game'})).toBeEnabled()
 await noOverflow(page)
})
