import './styles.css'
import type Phaser from 'phaser'
import MenuScene from './scenes/MenuScene'

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  parent: 'app',
  scene: [MenuScene],
  resolution: window.devicePixelRatio || 1,
  render: {
    pixelArt: false,
    antialias: true
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 500 },
      debug: false
    }
  }
}

const game = new Phaser.Game(config)
// expose for debugging and tests
;(window as any).game = game

// global error capture to surface runtime errors in the page console
window.addEventListener('error', (ev) => {
  // tslint:disable-next-line:no-console
  console.error('Global error:', ev.message, ev.error)
})

// register service worker for basic offline support (PWA)
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch((err) => {
    // swallow registration errors during dev
    console.warn('SW registration failed:', err)
  })
}
