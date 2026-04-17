import './styles.css'
import type Phaser from 'phaser'
// Scenes are loaded dynamically to enable code-splitting

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  parent: 'app',
  scene: [],
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
  // whitelist known scene names to avoid dynamic-import-vars issues
  const map: any = {
    'MapScene': () => import('./scenes/MapScene'),
    'MainScene': () => import('./scenes/MainScene'),
    'MenuScene': () => import('./scenes/MenuScene'),
    'EditorScene': () => import('./scenes/EditorScene')
  }

  if (sceneToOpen) {
    const loader = map[sceneToOpen]
    if (loader) {
      setTimeout(() => {
        loader().then((mod:any) => {
            try {
              const hasGet = game.scene && typeof (game.scene as any).get === 'function'
              if (hasGet) {
                if (!game.scene.get(sceneToOpen)) game.scene.add(sceneToOpen, mod.default, false)
              } else {
                try { (game.scene as any).add(sceneToOpen, mod.default, false) } catch(e) {}
              }
              try { game.scene.start(sceneToOpen) } catch(e) {}
            } catch(e) { console.warn('Failed to open scene from URL:', sceneToOpen, e) }
          }).catch((e) => { console.warn('Failed to open scene from URL:', sceneToOpen, e) })
      }, 0)
    }
  } else {
    // default behavior: dynamically load MenuScene and start it (defer to ensure SceneManager ready)
    setTimeout(() => {
      map['MenuScene']().then((mod:any) => {
        try {
          const hasGet = game.scene && typeof (game.scene as any).get === 'function'
          if (hasGet) {
            if (!game.scene.get('MenuScene')) game.scene.add('MenuScene', mod.default, false)
          } else {
            // fallback: attempt to add without checking
            try { (game.scene as any).add('MenuScene', mod.default, false) } catch(e) {}
          }
          try { game.scene.start('MenuScene') } catch(e) {}
        } catch(e) { console.warn('Failed to load MenuScene:', e) }
      }).catch((e) => { console.warn('Failed to load MenuScene:', e) })
    }, 0)
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
