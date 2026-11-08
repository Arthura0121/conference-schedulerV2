import {useEffect} from 'react'
import {attachThemeEffects} from '../themeEffects.js'
import '../styles/theme-effects.css'

export default function ThemeEffects() {
 useEffect(()=>attachThemeEffects(),[])
 return null
}
