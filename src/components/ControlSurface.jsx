import {forwardRef} from 'react'

function SurfaceArt() {
 return <theme-surface aria-hidden="true"><i/><i/><i/></theme-surface>
}

export const ControlButton = forwardRef(function ControlButton({children,...props},ref) {
 return <button {...props} ref={ref} data-control-surface>{children}<SurfaceArt/></button>
})

export function ControlLink({children,...props}) {
 return <a {...props} data-control-surface>{children}<SurfaceArt/></a>
}

export function ControlSummary({children,...props}) {
 return <summary {...props} data-control-surface>{children}<SurfaceArt/></summary>
}
