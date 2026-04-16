import type Phaser from 'phaser'
import { t, getLocale } from '../i18n'

export default class MainScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys
  private moveDir: number = 0
  private isJumping: boolean = false
  private speed: number = 220
  // multi-screen support
  private screens: any = null
  private currentScreen: number = 0
  // labyrinth support
  private screensMap: any = null
  private currentScreenId: string | null = null

  constructor() {
    super({ key: 'MainScene' })
  }

  // Ensure a texture is loaded; returns a promise that resolves when available
  private ensureTexture(key: string, url: string) {
    return new Promise<void>((resolve) => {
      try {
        if (this.textures.exists(key)) return resolve()
        // start loader for missing asset
        this.load.image(key, url)
        this.load.once('complete', () => { try { resolve() } catch(e) { resolve() } })
        this.load.start()
      } catch (e) { resolve() }
    })
  }

  // Ensure a spritesheet is loaded with given frame size
  private ensureSpritesheet(key: string, url: string, frameW: number, frameH: number) {
    return new Promise<void>((resolve) => {
      try {
        if (this.textures.exists(key)) return resolve()
        this.load.spritesheet(key, url, { frameWidth: frameW, frameHeight: frameH })
        this.load.once('complete', () => { try { resolve() } catch(e) { resolve() } })
        this.load.start()
      } catch (e) { resolve() }
    })
  }

  // Apply audio settings from localStorage: master, sfx, music
  private applyAudioSettings() {
    try {
      const master = parseFloat(localStorage.getItem('audio_master') || '1')
      const sfxLevel = parseFloat(localStorage.getItem('audio_sfx') || '1')
      const musicLevel = parseFloat(localStorage.getItem('audio_music') || '1')
      // clamp
      const m = Math.min(1, Math.max(0, isNaN(master) ? 1 : master))
      const s = Math.min(1, Math.max(0, isNaN(sfxLevel) ? 1 : sfxLevel))
      const mu = Math.min(1, Math.max(0, isNaN(musicLevel) ? 1 : musicLevel))
      // set global master
      try { this.sound.volume = m } catch(e) {}
      // apply to sfx objects using their base volumes
      const sfx: any = (this as any).sfx || {}
      if (sfx.hit && typeof sfx.hitBase === 'number') sfx.hit.setVolume(sfx.hitBase * s)
      if (sfx.collect && typeof sfx.collectBase === 'number') sfx.collect.setVolume(sfx.collectBase * s)
      if (sfx.jump && typeof sfx.jumpBase === 'number') sfx.jump.setVolume(sfx.jumpBase * s)
      // if there's music channel, apply mu (not implemented here)
      ;(this as any)._audioSettings = { master: m, sfx: s, music: mu }
    } catch (e) {}
  }

  // Create a small DOM audio settings panel with sliders
  private createAudioSettingsUI() {
    try {
      const containerId = 'audio-settings'
      let root = document.getElementById(containerId)
      if (!root) {
        root = document.createElement('div')
        root.id = containerId
        root.style.position = 'fixed'
        root.style.right = '12px'
        root.style.top = '60px'
        root.style.zIndex = '9999'
        root.style.background = 'rgba(6,12,20,0.7)'
        root.style.color = '#fff'
        root.style.padding = '10px'
        root.style.borderRadius = '8px'
        root.style.fontFamily = 'Arial, sans-serif'
        root.style.fontSize = '13px'
        root.style.display = 'none'
        root.style.minWidth = '220px'
        document.body.appendChild(root)
      }

      const makeRow = (label: string, key: string, min = 0, max = 1, step = 0.01) => {
        const row = document.createElement('div')
        row.style.marginBottom = '8px'
        const lab = document.createElement('div')
        lab.textContent = label
        lab.style.marginBottom = '4px'
        const input = document.createElement('input')
        input.type = 'range'
        input.min = String(min)
        input.max = String(max)
        input.step = String(step)
        input.value = localStorage.getItem(key) || '1'
        input.style.width = '100%'
        input.addEventListener('input', (ev) => {
          localStorage.setItem(key, (ev.target as HTMLInputElement).value)
          try { this.applyAudioSettings() } catch(e) {}
        })
        row.appendChild(lab)
        row.appendChild(input)
        return row
      }

      // clear
      root.innerHTML = ''
      root.appendChild(makeRow('Master', 'audio_master'))
      root.appendChild(makeRow('SFX', 'audio_sfx'))
      root.appendChild(makeRow('Music', 'audio_music'))

      const btnRow = document.createElement('div')
      btnRow.style.display = 'flex'
      btnRow.style.justifyContent = 'space-between'
      const closeBtn = document.createElement('button')
      closeBtn.textContent = 'Close'
      closeBtn.style.padding = '6px 8px'
      closeBtn.onclick = () => { root!.style.display = 'none' }
      const openBtn = document.getElementById('audio-settings-open') as HTMLButtonElement | null
      btnRow.appendChild(closeBtn)
      root.appendChild(btnRow)

      // small persistent open button
      let open = document.getElementById('audio-settings-open')
      if (!open) {
        open = document.createElement('button')
        open.id = 'audio-settings-open'
        open.textContent = 'Audio'
        open.style.position = 'fixed'
        open.style.right = '12px'
        open.style.top = '22px'
        open.style.zIndex = '9999'
        open.style.padding = '6px 8px'
        open.style.borderRadius = '6px'
        open.style.background = 'rgba(0,0,0,0.6)'
        open.style.color = '#fff'
        open.onclick = () => { root!.style.display = root!.style.display === 'none' ? 'block' : 'none' }
        document.body.appendChild(open)
      }
    } catch (e) {}
  }

  preload() {
    this.load.json('level1', '/levels/level1.json')
    this.load.json('level_labyrinth', '/levels/level_labyrinth.json')
    this.load.json('level_labyrinth_full', '/levels/level_labyrinth_full.json')
    // photorealistic-like background layers from placeholder service
    this.load.image('bg_far', 'https://picsum.photos/1600/900?random=101')
    this.load.image('bg_mid', 'https://picsum.photos/1600/900?random=102')
    this.load.image('bg_near', 'https://picsum.photos/1600/900?random=103')
    // variant assets (day/night/snow) will be loaded on demand from /assets/*.png
    // keep ground and player generation local (avoid 404s for missing files)
    // placeholder SFX (may be missing; safe to attempt)
    try { this.load.audio('sfx_hit', '/assets/sfx_hit.wav') } catch(e) {}
    try { this.load.audio('sfx_collect', '/assets/sfx_collect.wav') } catch(e) {}
    try { this.load.audio('sfx_jump', '/assets/sfx_jump.wav') } catch(e) {}
      this.load.json('level_multi', '/levels/level_multi.json')


  }

  async create() {
    try {
      // wrap create in try/catch to surface errors during scene initialization
      
    
    const w = this.scale.width
    const h = this.scale.height
    this.cameras.main.setBackgroundColor('#102030')

    // generate simple textures for placeholders
    const g = this.add.graphics()
    g.fillStyle(0xffcc00)
    g.fillRect(0, 0, 28, 44)
    g.generateTexture('player', 28, 44)
    g.clear()

    g.fillStyle(0x444444)
    g.fillRect(0, 0, w, 48)
    g.generateTexture('ground', w, 48)
    g.destroy()

    // select local asset if it loaded, otherwise fallback to remote placeholders
    const farKey = this.textures.exists('bg_far_local') ? 'bg_far_local' : 'bg_far';
    const midKey = this.textures.exists('bg_mid_local') ? 'bg_mid_local' : 'bg_mid';
    const nearKey = this.textures.exists('bg_near_local') ? 'bg_near_local' : 'bg_near';

    // background parallax layers
    // store tileSprites directly on the scene instance to avoid registry conflicts
    const tsFar = this.add.tileSprite(0, 0, w, h, farKey)
    tsFar.setOrigin(0)
    tsFar.setScrollFactor(0)
    ;(this as any).bgFar = tsFar;

    const tsMid = this.add.tileSprite(0, 0, w, h, midKey)
    tsMid.setOrigin(0)
    tsMid.setScrollFactor(0)
    ;(this as any).bgMid = tsMid;

    const tsNear = this.add.tileSprite(0, 0, w, h, nearKey)
    tsNear.setOrigin(0)
    tsNear.setScrollFactor(0)
    ;(this as any).bgNear = tsNear;

    // apply subtle tint/overlay to match game palette
    ;((this as any).bgFar as Phaser.GameObjects.TileSprite).setTint(0x22303a)
    ;((this as any).bgMid as Phaser.GameObjects.TileSprite).setTint(0x2a3b44)
    ;((this as any).bgNear as Phaser.GameObjects.TileSprite).setTint(0x384f59)
    ;console.log('MainScene: tints applied')

    // create a DOM blurred image behind the canvas to act as bloom
    try {
      const bloomContainer = document.getElementById('bloom')
      if (bloomContainer) {
        const img = document.createElement('img')
        img.alt = 'bloom'
        const variant = (localStorage.getItem('bgVariant') || 'day')
        img.src = '/assets/bg_near_' + variant + '.svg'
        bloomContainer.appendChild(img)
      }
    } catch (e) {
      // ignore DOM errors in non-browser contexts
    }

    // variant selector UI (cycles day -> night -> snow)
    ;console.log('MainScene: creating variant UI')
    const variants = ['day', 'night', 'snow']
    let variant = (localStorage.getItem('bgVariant') || 'day')
    const variantLabel = this.add.text(w - 180, 14, t('variant') + ': ' + variant.toUpperCase(), { font: '14px Arial', color: '#fff', backgroundColor: 'rgba(0,0,0,0.28)', padding: { x: 8, y: 6 } }).setDepth(10).setInteractive()
    const applyVariant = (v: string) => {
      localStorage.setItem('bgVariant', v)
      const far = 'bg_far_' + v
      const mid = 'bg_mid_' + v
      const near = 'bg_near_' + v

      // smooth crossfade for tileSprites: fade out, load textures if needed, swap, fade in
      const bgFar = (this as any).bgFar as Phaser.GameObjects.TileSprite
      const bgMid = (this as any).bgMid as Phaser.GameObjects.TileSprite
      const bgNear = (this as any).bgNear as Phaser.GameObjects.TileSprite

      this.tweens.add({ targets: [bgFar, bgMid, bgNear], alpha: 0, duration: 280, onComplete: async () => {
        try {
          // ensure textures exist (try PNG fallback in /assets)
          await Promise.all([
            this.ensureTexture(far, `/assets/${far}.png`),
            this.ensureTexture(mid, `/assets/${mid}.png`),
            this.ensureTexture(near, `/assets/${near}.png`)
          ])
          if (bgFar) bgFar.setTexture(this.textures.exists(far) ? far : 'bg_far')
          if (bgMid) bgMid.setTexture(this.textures.exists(mid) ? mid : 'bg_mid')
          if (bgNear) bgNear.setTexture(this.textures.exists(near) ? near : 'bg_near')
        } catch (e) {
          // ignore missing textures
        }
        // adjust tint per variant
        const tintMap: any = {
          day: [0x22303a, 0x2a3b44, 0x384f59],
          night: [0x06121a, 0x071922, 0x0f2430],
          snow: [0xe6f5fa, 0xdbeef5, 0xcfe6ef]
        }
        const t = tintMap[v] || tintMap.day
        if (bgFar) bgFar.setTint(t[0])
        if (bgMid) bgMid.setTint(t[1])
        if (bgNear) bgNear.setTint(t[2])

        this.tweens.add({ targets: [bgFar, bgMid, bgNear], alpha: 1, duration: 420 })
      }})

      // crossfade DOM bloom image for smoother visual change
      const bloomContainer = document.getElementById('bloom')
      if (bloomContainer) {
        const oldImg = bloomContainer.querySelector('img') as HTMLImageElement | null
        const newImg = document.createElement('img')
        newImg.alt = 'bloom'
        newImg.style.opacity = '0'
        newImg.src = '/assets/bg_near_' + v + '.svg'
        bloomContainer.appendChild(newImg)
        // force layout then fade in
        requestAnimationFrame(() => {
          newImg.style.opacity = '0.9'
          if (oldImg) oldImg.style.opacity = '0'
        })
        // remove old after transition
        if (oldImg) {
          oldImg.addEventListener('transitionend', () => { try { oldImg.remove() } catch (e) {} })
        }
      }

      variantLabel.setText(t('variant') + ': ' + v.toUpperCase())
    }
    variantLabel.on('pointerdown', () => {
      const idx = (variants.indexOf(variant) + 1) % variants.length
      variant = variants[idx]
      applyVariant(variant)
    })
    // apply initially
    applyVariant(variant)

    // Bloom presets (soft / strong) - add a small UI control to cycle presets
    ;console.log('MainScene: creating preset UI')
    const presets = ['soft', 'strong']
    let preset = (localStorage.getItem('bloomPreset') || 'soft')
    const presetLabel = this.add.text(w - 340, 14, t('bloom') + ': ' + preset.toUpperCase(), { font: '14px Arial', color: '#fff', backgroundColor: 'rgba(0,0,0,0.28)', padding: { x: 8, y: 6 } }).setDepth(10).setInteractive()
    const applyPreset = (p: string) => {
      localStorage.setItem('bloomPreset', p)
      const bloom = document.getElementById('bloom')
      if (bloom) {
        bloom.classList.remove('preset-soft', 'preset-strong')
        bloom.classList.add('preset-' + p)
      }
      // subtle alpha adjustment for background layers
      const bgFar = (this as any).bgFar as Phaser.GameObjects.TileSprite
      const bgMid = (this as any).bgMid as Phaser.GameObjects.TileSprite
      const bgNear = (this as any).bgNear as Phaser.GameObjects.TileSprite
      const alphaMap: any = { soft: 1, strong: 0.96 }
      if (bgFar) bgFar.setAlpha(alphaMap[p] || 1)
      if (bgMid) bgMid.setAlpha(alphaMap[p] || 1)
      if (bgNear) bgNear.setAlpha(alphaMap[p] || 1)
      presetLabel.setText(t('bloom') + ': ' + p.toUpperCase())
    }
    presetLabel.on('pointerdown', () => {
      const idx = (presets.indexOf(preset) + 1) % presets.length
      preset = presets[idx]
      applyPreset(preset)
    })
    // apply initially
    applyPreset(preset)

    // create platforms from level JSON (use groundImg)
    ;console.log('MainScene: creating platforms')
    const level = this.cache.json.get('level1') as any

    if (level && level.platforms) {
      level.platforms.forEach((p: any) => {
        const img = this.add.image(p.x, p.y, 'groundImg')
        img.setDisplaySize(p.width, p.height)
        img.setOrigin(0.5, 0.5)
        this.physics.add.existing(img, true)
        ;(this as any).platformBodies.push(img)
      })
      // ensure player collides with created platforms
      try { this.physics.add.collider(this.player, (this as any).platformBodies || []) } catch(e) {}
    }
      // multi-screen level support: check for labyrinth map first, then array maps
      const labFull = this.cache.json.get('level_labyrinth_full') as any
      const lab = labFull || this.cache.json.get('level_labyrinth') as any
      if (lab && lab.type === 'labyrinth' && lab.screens) {
        this.screensMap = lab.screens
        this.currentScreenId = lab.startId || Object.keys(lab.screens)[0]
        this.screens = null
      } else {
        const multi = this.cache.json.get('level_multi') as any
        this.screens = (multi && multi.screens) ? multi.screens : null
        this.currentScreen = (multi && typeof multi.startScreen === 'number') ? multi.startScreen : 0
        this.screensMap = null
        this.currentScreenId = null
      }
      // containers for platforms/items so we can clear them between screens
      ;(this as any).platformBodies = []
      ;(this as any).itemObjects = []
      ;(this as any).neighborButtons = []

      if (this.screens) {
        this.loadScreen(this.currentScreen)
      } else if (this.screensMap) {
        // load the starting screen id for labyrinth style maps
        this.loadScreen(this.currentScreenId as any)
      } else {
        // fallback to single-level behavior
        const level = this.cache.json.get('level1') as any
        if (level && level.platforms) {
          level.platforms.forEach((p: any) => {
            const img = this.add.image(p.x, p.y, 'groundImg')
            img.setDisplaySize(p.width, p.height)
            img.setOrigin(0.5, 0.5)
            this.physics.add.existing(img, true)
          })
        }
      }

    // player (physics sprite) - generate a glossy modern sprite to simulate polished art
    ;console.log('MainScene: creating player')
    const start = level?.playerStart || { x: 100, y: h - 100 }
    // generate a rounded rect base and add a subtle sheen for gloss
    const pG = this.add.graphics()
    const radiusW = 32
    const radiusH = 44
    pG.fillStyle(0xffe28a, 1)
    pG.fillRoundedRect(0, 0, radiusW, radiusH, 8)
    // sheen highlight
    pG.fillStyle(0xffffff, 0.6)
    pG.fillEllipse(8, 10, 14, 8)
    pG.generateTexture('player_gloss', radiusW, radiusH)
    pG.clear()

    // create a simple animated player using sampled photo placeholders
    const idStrStart = (this.currentScreenId) ? this.currentScreenId : String(this.currentScreen)
    const vStart = (localStorage.getItem('bgVariant') || 'day')
    const sampleKeyStart = this.textures.exists('bg_near_' + idStrStart + '_' + vStart) ? ('bg_near_' + idStrStart + '_' + vStart) : (this.textures.exists('bg_near_' + vStart) ? ('bg_near_' + vStart) : 'bg_near')

    const sheetName = `player_sheet_${idStrStart}_${vStart}`
    let usedSheet = false
    // try to prefer generated spritesheet if available in public/assets
    try {
      const sheetPath = `/assets/${sheetName}.png`
      await this.ensureSpritesheet(sheetName, sheetPath, 28, 44)
      if (this.textures.exists(sheetName)) {
        usedSheet = true
      }
    } catch(e) {}

    if (usedSheet) {
      this.player = this.physics.add.sprite(start.x, start.y, sheetName, 0)
      // create animations from spritesheet if not exists
      try {
        if (!this.anims.exists('player_walk')) {
          this.anims.create({ key: 'player_walk', frames: this.anims.generateFrameNumbers(sheetName, { start: 0, end: 3 }), frameRate: 8, repeat: -1 })
        }
        if (!this.anims.exists('player_idle')) {
          this.anims.create({ key: 'player_idle', frames: [{ key: sheetName, frame: 0 }], frameRate: 1, repeat: -1 })
        }
        if (!this.anims.exists('player_jump')) {
          this.anims.create({ key: 'player_jump', frames: [{ key: sheetName, frame: 2 }], frameRate: 1, repeat: 0 })
        }
      } catch(e) {}
      this.player.play('player_walk')
    } else {
      const makePlayerFrames = (idStr: string, v: string, sampleKey: string) => {
        const frames: any[] = []
        for (let i = 0; i < 4; i++) {
          const key = `player_frame_${idStr}_${v}_${i}`
          if (!this.textures.exists(key)) {
            try {
              const rt = this.make.renderTexture({ width: 28, height: 44, add: false })
              const tmp = this.make.image({ key: sampleKey, add: false })
              tmp.setOrigin(0)
              tmp.setDisplaySize(28, 44)
              // apply small offset/tint per frame to simulate movement
              tmp.setTintFill(Phaser.Display.Color.GetColor(255 - i * 6, 255 - i * 4, 255 - i * 3))
              rt.draw(tmp, -i * 2, 0)
              tmp.destroy()
              rt.saveTexture(key)
              rt.destroy()
            } catch (e) {}
          }
          frames.push({ key })
        }
        return frames
      }

      const playerFrames = makePlayerFrames(idStrStart, vStart, sampleKeyStart)
      const playerKey0 = playerFrames[0].key
      this.player = this.physics.add.sprite(start.x, start.y, playerKey0)
      try {
        if (!this.anims.exists('player_walk')) {
          this.anims.create({ key: 'player_walk', frames: playerFrames, frameRate: 8, repeat: -1 })
        }
        this.player.play('player_walk')
        // idle and jump animations
        if (!this.anims.exists('player_idle')) {
          this.anims.create({ key: 'player_idle', frames: [ playerFrames[0] ], frameRate: 1, repeat: -1 })
        }
        if (!this.anims.exists('player_jump')) {
          const jf = playerFrames[Math.min(2, playerFrames.length-1)]
          this.anims.create({ key: 'player_jump', frames: [ jf ], frameRate: 1, repeat: 0 })
        }
      } catch (e) {}
    }
    this.player.setDisplaySize(28, 44)
    this.player.setCollideWorldBounds(true)
    this.player.setBounce(0.08)
    ;(this as any).player.hp = 5
    // fallback to a generated glossy texture if player frames failed to create
    try {
      if (!this.textures.exists(playerKey0)) {
        if (this.textures.exists('player_gloss')) {
          this.player.setTexture('player_gloss')
          this.player.setDisplaySize(radiusW, radiusH)
        }
      }
    } catch (e) {}
    // register animation if not exists
    try {
      if (!this.anims.exists('player_walk')) {
        this.anims.create({ key: 'player_walk', frames: playerFrames, frameRate: 8, repeat: -1 })
      }
      this.player.play('player_walk')
      // idle and jump animations
      if (!this.anims.exists('player_idle')) {
        this.anims.create({ key: 'player_idle', frames: [ playerFrames[0] ], frameRate: 1, repeat: -1 })
      }
      if (!this.anims.exists('player_jump')) {
        const jf = playerFrames[Math.min(2, playerFrames.length-1)]
        this.anims.create({ key: 'player_jump', frames: [ jf ], frameRate: 1, repeat: 0 })
      }
    } catch (e) {}

    // particle emitter for landing/jump effects (created early so items can use it)
    const partG = this.add.graphics()
    partG.fillStyle(0xffffff, 1)
    partG.fillCircle(4, 4, 4)
    partG.generateTexture('particle_white', 8, 8)
    partG.destroy()

    // create a particle emitter when available, otherwise fall back to a lightweight emitter implementation
    let emitter: any = null
    try {
      const particlesMgr: any = this.add.particles('particle_white')
      if (particlesMgr && typeof particlesMgr.createEmitter === 'function') {
        emitter = particlesMgr.createEmitter({
          speed: { min: -80, max: 80 },
          scale: { start: 0.8, end: 0 },
          alpha: { start: 0.9, end: 0 },
          lifespan: 600,
          quantity: 6,
          blendMode: 'ADD'
        })
      } else {
        throw new Error('createEmitter not available')
      }
    } catch (e) {
      // fallback lightweight emitter: create small circles and tween them out
      emitter = {
        emitParticleAt: (x: number, y: number, qty = 6) => {
          for (let i = 0; i < qty; i++) {
            const px = Phaser.Math.Between(x - 6, x + 6)
            const py = Phaser.Math.Between(y - 6, y + 6)
            const dot = this.add.circle(px, py, 2, 0xffffff, 1).setDepth(5)
            const vx = Phaser.Math.Between(-80, 80)
            const vy = Phaser.Math.Between(-140, -20)
            this.tweens.add({
              targets: dot,
              x: px + vx,
              y: py + vy,
              alpha: { from: 1, to: 0 },
              scale: { from: 1, to: 0 },
              duration: 600,
              onComplete: () => { try { dot.destroy() } catch (e) {} }
            })
          }
        }
      }
    }

    // load SFX into sound objects if available
    ;(this as any).sfx = {}
    try {
      if (this.cache && (this.cache as any).audio && (this.cache as any).audio.exists && (this.cache as any).audio.exists('sfx_hit')) {
        ;(this as any).sfx.hit = this.sound.add('sfx_hit', { volume: 0.6 })
        ;(this as any).sfx.hitBase = 0.6
      }
      if (this.cache && (this.cache as any).audio && (this.cache as any).audio.exists && (this.cache as any).audio.exists('sfx_collect')) {
        ;(this as any).sfx.collect = this.sound.add('sfx_collect', { volume: 0.9 })
        ;(this as any).sfx.collectBase = 0.9
      }
      if (this.cache && (this.cache as any).audio && (this.cache as any).audio.exists && (this.cache as any).audio.exists('sfx_jump')) {
        ;(this as any).sfx.jump = this.sound.add('sfx_jump', { volume: 0.72 })
        ;(this as any).sfx.jumpBase = 0.72
      }
    } catch (e) {}

    // apply audio settings (master / sfx / music) from localStorage
    try { this.applyAudioSettings() } catch(e) {}

    // create audio settings UI (DOM overlay)
    try { this.createAudioSettingsUI() } catch(e) {}

    // items (collectibles)
    if (level && level.items) {
      level.items.forEach((it: any) => {
        const c = this.add.circle(it.x, it.y, 10, 0xff66aa)
        this.physics.add.existing(c)
        const body = c.body as Phaser.Physics.Arcade.Body
        body.setAllowGravity(false)
        body.setImmovable(true)
        this.physics.add.overlap(this.player, c, () => {
          // particle burst when collected
          if (emitter) emitter.emitParticleAt(c.x, c.y, 12)
            try { (this as any).sfx && (this as any).sfx.collect && (this as any).sfx.collect.play() } catch(e){}
          c.destroy()
        })
      })
    }

    // HUD: player health
    ;(this as any).hud = this.add.text(10, 32, `HP: ${(this as any).player.hp}`, { font: '16px Arial', color: '#ffdddd' }).setDepth(20)

    // keyboard
    this.cursors = this.input.keyboard.createCursorKeys()

    // touch controls (visible placeholders)
    const left = this.add.circle(60, h - 60, 50, 0x000000, 0.25).setInteractive()
    const right = this.add.circle(180, h - 60, 50, 0x000000, 0.25).setInteractive()
    const jump = this.add.circle(w - 80, h - 60, 60, 0x000000, 0.25).setInteractive()
    this.add.text(36, h - 72, '◀', { font: '24px Arial', color: '#fff' })
    this.add.text(164, h - 72, '▶', { font: '24px Arial', color: '#fff' })
    this.add.text(w - 98, h - 78, t('jump'), { font: '14px Arial', color: '#fff' })

    left.on('pointerdown', () => (this.moveDir = -1))
    left.on('pointerup', () => (this.moveDir = 0))
    left.on('pointerout', () => (this.moveDir = 0))
    right.on('pointerdown', () => (this.moveDir = 1))
    right.on('pointerup', () => (this.moveDir = 0))
    right.on('pointerout', () => (this.moveDir = 0))
    jump.on('pointerdown', () => (this.isJumping = true))
    jump.on('pointerup', () => (this.isJumping = false))

    

    // simple shadow below player
    const shadow = this.add.ellipse(this.player.x, this.player.y + 22, 36, 12, 0x000000, 0.3)
    shadow.setDepth(-1)

    // when player collides with platforms, emit particles
    this.physics.world.on('worldstep', () => {
      const body = this.player.body as Phaser.Physics.Arcade.Body
      if (body.blocked.down && Math.abs(body.velocity.y) > 120) {
        emitter.emitParticleAt(this.player.x, this.player.y + 22, 12)
        try {
          const now = Date.now()
          const last = (this as any)._lastLandingTime || 0
          if (now - last > 220) {
            (this as any)._lastLandingTime = now
            (this as any).sfx && (this as any).sfx.hit && (this as any).sfx.hit.play()
          }
        } catch(e){}
      }
      shadow.setPosition(this.player.x, this.player.y + 22)
    })

    // basic instructions text (localized)
    this.add.text(10, 10, t('prototypeInstructions'), { font: '16px Arial', color: '#ffffff' })
    
    } catch (err) {
      try { console.error('MainScene create error:', err, err && err.stack) } catch(e) { console.error('MainScene error logging failed', e) }
      throw err
    }
  }

  update(time: number, delta: number) {
    const dt = delta / 1000
    const w = this.scale.width
    const h = this.scale.height

    let dir = 0
    if (this.cursors.left?.isDown) dir = -1
    if (this.cursors.right?.isDown) dir = 1
    if (this.moveDir !== 0) dir = this.moveDir

    // horizontal movement using arcade velocity
    this.player.setVelocityX(dir * this.speed)

    // jump when on ground
    const body = this.player.body as Phaser.Physics.Arcade.Body
    if ((this.cursors.up?.isDown || this.isJumping) && body.blocked.down) {
      this.player.setVelocityY(-350)
      this.isJumping = false
      try { (this as any).sfx && (this as any).sfx.jump && (this as any).sfx.jump.play() } catch(e){}
      try { this.player.play('player_jump') } catch(e){}
    }

    // slight friction when no input
    if (dir === 0 && body.blocked.down) {
      this.player.setVelocityX(0)
    }

    // clamp to screen horizontally
    this.player.x = Phaser.Math.Clamp(this.player.x, 16, w - 16)

    // parallax background movement based on player input
    const bgFar = (this as any).bgFar as Phaser.GameObjects.TileSprite
    const bgMid = (this as any).bgMid as Phaser.GameObjects.TileSprite
    const bgNear = (this as any).bgNear as Phaser.GameObjects.TileSprite
    if (bgFar) bgFar.tilePositionX += dir * this.speed * 0.02 * dt
    if (bgMid) bgMid.tilePositionX += dir * this.speed * 0.04 * dt
    if (bgNear) bgNear.tilePositionX += dir * this.speed * 0.08 * dt
    // screen-edge transitions (when multi-screen level present)
    if (this.screens) {
      const margin = 12
      if (this.player.x < margin) {
        this.changeScreen(-1)
      } else if (this.player.x > this.scale.width - margin) {
        this.changeScreen(1)
      }
    } else if (this.screensMap && this.currentScreenId) {
      const margin = 12
      const cur = this.screensMap[this.currentScreenId]
      if (this.player.x < margin) {
        const nid = cur?.neighbors?.left || cur?.neighbors?.west
        if (nid) this.changeScreenTo(nid)
      } else if (this.player.x > this.scale.width - margin) {
        const nid = cur?.neighbors?.right || cur?.neighbors?.east
        if (nid) this.changeScreenTo(nid)
      } else if (this.player.y < margin) {
        const nid = cur?.neighbors?.up || cur?.neighbors?.north
        if (nid) this.changeScreenTo(nid)
      } else if (this.player.y > this.scale.height - margin) {
        const nid = cur?.neighbors?.down || cur?.neighbors?.south
        if (nid) this.changeScreenTo(nid)
      }
    }

    // update simple enemy patrols
    try {
      const enemies = (this as any).enemies || []
      const p: any = this.player
      enemies.forEach((en: any) => {
        if (!en) return
        const patrol = en.patrol
        const dist = Phaser.Math.Distance.Between(en.x, en.y, p.x, p.y)
        if (dist < (en.detectRadius || 160)) {
          // chase
          en.state = 'chase'
          const dirx = (p.x > en.x) ? 1 : -1
          en.setVelocityX(dirx * (en.patrol?.speed || 80))
        } else if (patrol) {
          en.state = 'patrol'
          en.setVelocityX((patrol.dir || -1) * (patrol.speed || 60))
          if (en.x < patrol.originX - patrol.range) patrol.dir = 1
          if (en.x > patrol.originX + patrol.range) patrol.dir = -1
        }
        // limit enemy velocity
        if (Math.abs((en.body && en.body.velocity.x) || 0) > 240) en.setVelocityX(0)
      })
    } catch (e) {}
    // update player animation state
    try { this.updatePlayerAnim(dir) } catch(e) {}
  }

  // change screen by delta (-1 left, +1 right) for array-based screens
  changeScreen(delta: number) {
    if (!this.screens) return
    const next = this.currentScreen + delta
    if (next < 0 || next >= this.screens.length) return
    // prevent rapid repeated transitions
    if ((this as any)._screenChanging) return
    ;(this as any)._screenChanging = true
    this.player.setVelocity(0, 0)
    this.player.setActive(false)
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.currentScreen = next
      try { this.loadScreen(this.currentScreen) } catch (e) { console.error(e) }
      this.cameras.main.fadeIn(300)
      this.player.setActive(true)
      ;(this as any)._screenChanging = false
    })
    this.cameras.main.fadeOut(220)
  }

  // change to a specific screen id (labyrinth/map based)
  changeScreenTo(id: string) {
    if (!this.screensMap) return
    if (!this.screensMap[id]) return
    if ((this as any)._screenChanging) return
    ;(this as any)._screenChanging = true
    this.player.setVelocity(0, 0)
    this.player.setActive(false)
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.currentScreenId = id
      try { this.loadScreen(this.currentScreenId) } catch (e) { console.error(e) }
      this.cameras.main.fadeIn(300)
      this.player.setActive(true)
      ;(this as any)._screenChanging = false
    })
    this.cameras.main.fadeOut(220)
  }

  async loadScreen(index: number | string) {
    let s: any = null
    if (typeof index === 'string') {
      s = this.screensMap ? this.screensMap[index] : null
    } else {
      s = this.screens ? this.screens[index] : null
    }
    if (!s) return
    // clear previous platforms/items
    try {
      ;(this as any).platformBodies.forEach((b: any) => { try { if (b.gameObject) b.gameObject.destroy() } catch(e){} })
    } catch (e) {}
    ;(this as any).platformBodies = []
    try {
      ;(this as any).itemObjects.forEach((it: any) => { try { it.destroy() } catch(e){} })
    } catch (e) {}
    ;(this as any).itemObjects = []

    // set visual variant for this screen
    if (s.variant) {
      localStorage.setItem('bgVariant', s.variant)
      const bloom = document.getElementById('bloom')
      if (bloom) {
        const img = bloom.querySelector('img') as HTMLImageElement | null
        if (img) img.src = '/assets/bg_near_' + s.variant + '.svg'
      }
    }

    // Immediately apply tileSprite textures and tints for the variant
    try {
      const v = s.variant || (localStorage.getItem('bgVariant') || 'day')
      const far = 'bg_far_' + v
      const mid = 'bg_mid_' + v
      const near = 'bg_near_' + v
      const bgFar = (this as any).bgFar as Phaser.GameObjects.TileSprite
      const bgMid = (this as any).bgMid as Phaser.GameObjects.TileSprite
      const bgNear = (this as any).bgNear as Phaser.GameObjects.TileSprite
      // ensure per-variant textures are loaded (fallback to global placeholders)
      try {
        await Promise.all([
          this.ensureTexture(far, `/assets/${far}.png`),
          this.ensureTexture(mid, `/assets/${mid}.png`),
          this.ensureTexture(near, `/assets/${near}.png`)
        ])
      } catch(e) {}
      if (bgFar) bgFar.setTexture(this.textures.exists(far) ? far : 'bg_far')
      if (bgMid) bgMid.setTexture(this.textures.exists(mid) ? mid : 'bg_mid')
      if (bgNear) bgNear.setTexture(this.textures.exists(near) ? near : 'bg_near')
      const tintMap: any = {
        day: [0x22303a, 0x2a3b44, 0x384f59],
        night: [0x06121a, 0x071922, 0x0f2430],
        snow: [0xe6f5fa, 0xdbeef5, 0xcfe6ef]
      }
      const t = tintMap[v] || tintMap.day
      if (bgFar) bgFar.setTint(t[0])
      if (bgMid) bgMid.setTint(t[1])
      if (bgNear) bgNear.setTint(t[2])
      // adjust alpha/contrast-like feel per variant
      const alphaMap: any = { day: 1, night: 0.92, snow: 1.02 }
      if (bgFar) bgFar.setAlpha(alphaMap[v] || 1)
      if (bgMid) bgMid.setAlpha(alphaMap[v] || 1)
      if (bgNear) bgNear.setAlpha(alphaMap[v] || 1)

      // generate quick photoreal 'player' texture sampled from the near background
      try {
        const idStr = (typeof index === 'string') ? index : String(index)
        const sampleKey = this.textures.exists('bg_near_' + idStr + '_' + v) ? ('bg_near_' + idStr + '_' + v) : (this.textures.exists('bg_near_' + v) ? ('bg_near_' + v) : 'bg_near')
        const playerTex = `player_photo_${idStr}_${v}`
        if (!this.textures.exists(playerTex)) {
          const rt = this.make.renderTexture({ width: 48, height: 48, add: false })
          const tmp = this.make.image({ key: sampleKey, add: false })
          tmp.setOrigin(0)
          tmp.setDisplaySize(48, 48)
          rt.draw(tmp, 0, 0)
          tmp.destroy()
          rt.saveTexture(playerTex)
          rt.destroy()
        }
        // prefer the generated player texture
        if ((this as any).player) {
          try { (this as any).player.setTexture(playerTex) } catch (e) {}
        }
      } catch (e) {}
    } catch (e) {}

    // clear neighbor buttons
    try { ;(this as any).neighborButtons.forEach((b: any) => { try { b.destroy() } catch(e){} }) } catch(e){}
    ;(this as any).neighborButtons = []

    // create neighbor navigation buttons for labyrinth maps
    if (s.neighbors) {
      const w = this.scale.width
      const h = this.scale.height
      Object.entries(s.neighbors).forEach(([dir, tid]: any, idx) => {
        let x = w/2, y = h/2
        let label = '→'
        if (dir === 'left' || dir === 'west') { x = 40; y = h/2; label = '◀' }
        if (dir === 'right' || dir === 'east') { x = w - 40; y = h/2; label = '▶' }
        if (dir === 'up' || dir === 'north') { x = w/2; y = 40; label = '▲' }
        if (dir === 'down' || dir === 'south') { x = w/2; y = h - 40; label = '▼' }
        const btn = this.add.text(x, y, label, { font: '20px Arial', color: '#fff', backgroundColor: 'rgba(0,0,0,0.35)', padding: { x: 8, y: 6 } }).setInteractive()
        btn.on('pointerdown', () => { try { this.changeScreenTo(tid as string) } catch(e){} })
        ;(this as any).neighborButtons.push(btn)
      })
    }

    // create platforms
    if (s.platforms) {
      s.platforms.forEach((p: any) => {
        const px = (p.x || 0)
        // try to create a photoreal ground texture for this platform size from the near background
        const idStr = (typeof index === 'string') ? index : String(index)
        const v = s.variant || (localStorage.getItem('bgVariant') || 'day')
        const sampleKey = this.textures.exists('bg_near_' + idStr + '_' + v) ? ('bg_near_' + idStr + '_' + v) : (this.textures.exists('bg_near_' + v) ? ('bg_near_' + v) : 'bg_near')
        const groundTex = `ground_photo_${idStr}_${v}_${Math.max(64, p.width||128)}`
        try {
          if (!this.textures.exists(groundTex)) {
            const rw = Math.max(64, Math.floor(p.width || 128))
            const rh = Math.max(24, Math.floor(p.height || 32))
            const rt = this.make.renderTexture({ width: rw, height: rh, add: false })
            const tmp = this.make.image({ key: sampleKey, add: false })
            tmp.setOrigin(0)
            tmp.setDisplaySize(rw, rh)
            rt.draw(tmp, 0, 0)
            tmp.destroy()
            rt.saveTexture(groundTex)
            rt.destroy()
          }
        } catch (e) {}

        const img = this.add.image(px + (p.width||0)/2, p.y, this.textures.exists(groundTex) ? groundTex : 'groundImg')
        img.setDisplaySize(p.width, p.height)
        img.setOrigin(0.5, 0.5)
        this.physics.add.existing(img, true)
        ;(this as any).platformBodies.push(img)
      })
    }

    // create items
    if (s.items) {
      s.items.forEach((it: any) => {
        const c = this.add.circle(it.x, it.y, 10, 0xff66aa)
        this.physics.add.existing(c)
        const body = c.body as Phaser.Physics.Arcade.Body
        body.setAllowGravity(false)
        body.setImmovable(true)
        this.physics.add.overlap(this.player, c, () => { try { c.destroy() } catch(e){} })
        ;(this as any).itemObjects.push(c)
      })
    }

    // ensure player collides with platforms for this screen
    try { this.physics.add.collider(this.player, (this as any).platformBodies || []) } catch(e) {}

    // spawn enemies for this screen (improved AI: patrol + chase + damage)
    try {
      ;(this as any).enemies = (this as any).enemies || []
      if (s.enemies && Array.isArray(s.enemies)) {
        s.enemies.forEach((e: any) => {
          const es = this.physics.add.sprite(e.x, e.y, 'player')
          es.setDisplaySize(28, 36)
          es.setImmovable(false)
          es.body.setAllowGravity(true)
          ;(es as any).hp = e.hp || 1
          ;(es as any).patrol = { originX: e.x, range: e.patrolRange || 120, speed: e.speed || 60, dir: -1 }
          ;(es as any).state = 'patrol'
          ;(es as any).detectRadius = e.detectRadius || 160
          this.physics.add.collider(es, (this as any).platformBodies || [])
          this.physics.add.overlap(this.player, es, () => {
            try {
              // damage player
              const p: any = this.player
              if (p && !p._invulnerable) {
                p.hp = (p.hp || 1) - 1
                p._invulnerable = true
                this.tweens.add({ targets: p, alpha: 0.2, yoyo: true, duration: 100, repeat: 4, onComplete: () => { p._invulnerable = false; p.alpha = 1 } })
                ;(this as any).hud.setText('HP: ' + (p.hp || 0))
                try { (this as any).sfx && (this as any).sfx.hit && (this as any).sfx.hit.play() } catch(e){}
                if (p.hp <= 0) {
                  // respawn player at screen start
                  p.hp = 5
                  ;(this as any).hud.setText('HP: ' + p.hp)
                  p.x = start.x || 100
                  p.y = start.y || (this.scale.height - 100)
                }
              }
            } catch (err) {}
          })
          ;(this as any).enemies.push(es)
        })
      }
    } catch (e) {}

    // position player
    const start = s.playerStart || { x: 120, y: this.scale.height - 160 }
    this.player.x = start.x
    this.player.y = start.y
  }

  // small helper to update player animation state
  private updatePlayerAnim(dir: number) {
    try {
      const body = this.player.body as Phaser.Physics.Arcade.Body
      if (!body) return
      if (!body.blocked.down) {
        if (!this.anims.exists('player_jump')) return
        if (this.player.anims && this.player.anims.currentAnim && this.player.anims.currentAnim.key === 'player_jump') return
        this.player.play('player_jump')
        return
      }
      if (dir !== 0) {
        if (!this.anims.exists('player_walk')) return
        if (this.player.anims && this.player.anims.currentAnim && this.player.anims.currentAnim.key === 'player_walk') return
        this.player.play('player_walk')
        return
      }
      if (!this.anims.exists('player_idle')) return
      if (this.player.anims && this.player.anims.currentAnim && this.player.anims.currentAnim.key === 'player_idle') return
      this.player.play('player_idle')
    } catch (e) {}
  }
}
