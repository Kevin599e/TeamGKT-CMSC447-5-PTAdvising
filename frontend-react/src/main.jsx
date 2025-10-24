import React from 'react'
import { createRoot } from 'react-dom/client'

function App(){
  return <div style={{fontFamily:'system-ui', padding:16}}>
    <h1>UMBC Advisor Packet (React)</h1>
    <p>Replace vanilla frontend by building components here.</p>
  </div>
}

createRoot(document.getElementById('root')).render(<App/>)
