import {useState} from 'react'
import {sound} from '../sound.js'
import Icon from '../components/Icon.jsx'
// Optional sound: OFF by default, preference stays in this browser. Played only from explicit user actions (see App.jsx).
export default function SoundToggle({compact = false}) {
  const [on, setOn] = useState(sound.isOn())
  return <button className="soundbtn" aria-pressed={on} aria-label={on ? 'Sounds on. Turn off' : 'Sounds off. Turn on'}
    onClick={() => { const v = sound.setOn(!on); setOn(v); sound.play('select') }}>
    <Icon name={on ? 'volume' : 'mute'} size={18} />{!compact && <span>{on ? 'Sound on' : 'Sound off'}</span>}
  </button>
}
