import {defineConfig} from '@playwright/test'
export default defineConfig({testDir:'tests/e2e',use:{baseURL:'http://localhost:5173'},webServer:{command:'npm run dev',url:'http://localhost:5173',reuseExistingServer:true},projects:[{name:'desktop',use:{viewport:{width:1280,height:800}}},{name:'phone',use:{viewport:{width:390,height:844}}}]})
