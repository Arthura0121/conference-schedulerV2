import {createRoot} from 'react-dom/client'
import App from './App.jsx'
import {ToastProvider, ConfirmProvider} from './components/ui.jsx'
import './style.css'
import './styles/notifications.css'
createRoot(document.getElementById('root')).render(<ToastProvider><ConfirmProvider><App /></ConfirmProvider></ToastProvider>)
