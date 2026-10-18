// Needs a real Supabase project in .env (see SETUP.md) with supabase/seed.sql applied and ONE admin created. Not run in the build environment.
import {test,expect} from '@playwright/test'
test('student page loads, Times/Calendar choice persists, no horizontal scroll',async({page})=>{
 await page.goto('/');await expect(page.getByRole('heading',{name:/conference|Back Soon/i})).toBeVisible()
 if(await page.getByRole('button',{name:'Times'}).isVisible()){await page.getByRole('button',{name:'Times'}).click();await page.reload();await expect(page.getByRole('button',{name:'Times'})).toHaveAttribute('aria-pressed','true')}
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1)).toBe(true)})
test('teacher page uses the themed secure sign-in, not the old legacy login',async({page})=>{
 await page.goto('/#admin')
 await expect(page.getByRole('heading',{name:'Welcome back.'})).toBeVisible()
 await expect(page.getByRole('textbox',{name:'Email address'})).toBeVisible()
 await expect(page.getByRole('button',{name:'Sign in to dashboard'})).toBeDisabled()
 await expect(page.getByRole('button',{name:'Show password'})).toBeVisible()
 await expect(page.getByRole('link',{name:/student reservations/i})).toBeVisible()
 await expect(page.locator('main.teacher-auth')).toHaveAttribute('data-theme',/^(aurora|fall|halloween|winter)$/)
 await expect(page.getByText('Open',{exact:true})).toHaveCount(0)
})
test('student cannot call admin functions directly',async({page})=>{await page.goto('/');const r=await page.evaluate(async()=>{const m=await import('/src/sb.js');await m.sb.auth.signInAnonymously();const{error}=await m.sb.rpc('admin_bookings');return error?.message});expect(r).toBe('forbidden')})
