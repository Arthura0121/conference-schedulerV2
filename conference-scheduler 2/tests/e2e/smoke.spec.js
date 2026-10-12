// Needs a real Supabase project in .env (see SETUP.md) with supabase/seed.sql applied and ONE admin created. Not run in the build environment.
import {test,expect} from '@playwright/test'
test('student page loads, view toggle persists, no horizontal scroll',async({page})=>{
 await page.goto('/');await expect(page.getByRole('heading',{name:/Writing Conferences|Back Soon/})).toBeVisible()
 if(await page.getByRole('button',{name:'List'}).isVisible()){await page.getByRole('button',{name:'List'}).click();await page.reload();await expect(page.getByRole('button',{name:'List'})).toHaveAttribute('aria-pressed','true')}
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1)).toBe(true)})
test('teacher page requires sign-in',async({page})=>{await page.goto('/#admin');await expect(page.getByRole('heading',{name:'Teacher sign-in'})).toBeVisible();await expect(page.getByText('Open',{exact:true})).toHaveCount(0)})
test('student cannot call admin functions directly',async({page})=>{await page.goto('/');const r=await page.evaluate(async()=>{const m=await import('/src/sb.js');await m.sb.auth.signInAnonymously();const{error}=await m.sb.rpc('admin_bookings');return error?.message});expect(r).toBe('forbidden')})
