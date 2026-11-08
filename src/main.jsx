import {createRoot} from 'react-dom/client'
import App from './App.jsx'
import ThemeEffects from './components/ThemeEffects.jsx'
import {VisitorPresenceProvider} from './components/VisitorCounter.jsx'
import {ToastProvider, ConfirmProvider} from './components/ui.jsx'
import {rememberedTheme, applySiteTheme} from './themes.js'
import './style.css'
import './styles/notifications.css'
import './styles/interface.css'
// Apply the last known public appearance before the first React paint.
applySiteTheme(rememberedTheme())
createRoot(document.getElementById('root')).render(<ToastProvider><ConfirmProvider><VisitorPresenceProvider><App /></VisitorPresenceProvider><ThemeEffects /></ConfirmProvider></ToastProvider>)
