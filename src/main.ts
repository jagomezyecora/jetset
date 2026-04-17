import './styles.css'
import type Phaser from 'phaser'
import MenuScene from './scenes/MenuScene'
import MapScene from './scenes/MapScene'

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  parent: 'app',
  scene: [MenuScene, MapScene],
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

// support URL query ?scene=MapScene or ?scene=MainScene to open directly (useful for testing)
try {
  const qs = new URLSearchParams(window.location.search)
  const sceneToOpen = qs.get('scene')
  if (sceneToOpen) {
    // whitelist known scene names to avoid dynamic-import-vars issues
    const map: any = {
      'MapScene': () => import('./scenes/MapScene'),
      'MainScene': () => import('./scenes/MainScene'),
      'MenuScene': () => import('./scenes/MenuScene'),
      'EditorScene': () => import('./scenes/EditorScene')
    }
    const loader = map[sceneToOpen]
    if (loader) {
      loader().then((mod:any) => {
        if (!game.scene.get(sceneToOpen)) game.scene.add(sceneToOpen, mod.default, false)
        game.scene.start(sceneToOpen)
      }).catch((e) => { console.warn('Failed to open scene from URL:', sceneToOpen, e) })
    }
  }
} catch(e) {}

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
