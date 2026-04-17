import type Phaser from 'phaser'
import { t } from '../i18n'

export default class MapScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MapScene' })
  }

  create() {
    const w = this.scale.width
    const h = this.scale.height
    this.cameras.main.setBackgroundColor('#06121a')

    this.add.text(w/2, 24, t('mapTitle') || 'Map', { font: '20px Arial', color: '#fff' }).setOrigin(0.5)

    const labFull = this.cache.json.get('level_labyrinth_full') as any
    const lab = labFull || this.cache.json.get('level_labyrinth') as any
    if (!lab || !lab.screens) {
      this.add.text(w/2, h/2, 'No labyrinth data', { font: '16px Arial', color: '#f88' }).setOrigin(0.5)
      return
    }

    // derive grid bounds from ids (expect rNcM or arbitrary ids)
    const ids = Object.keys(lab.screens)
    // try parse r{row}c{col}
    const cells: any[] = []
    let rows = 0, cols = 0
    ids.forEach(id => {
      const m = id.match(/r(\d+)c(\d+)/i)
      if (m) {
        const r = parseInt(m[1],10)-1
        const c = parseInt(m[2],10)-1
        rows = Math.max(rows, r+1)
        cols = Math.max(cols, c+1)
        cells.push({ id, r, c, meta: lab.screens[id] })
      } else {
        cells.push({ id, r: 0, c: 0, meta: lab.screens[id] })
      }
    })
    if (rows === 0) { rows = 1 }
    if (cols === 0) { cols = Math.max(1, ids.length) }

    const padding = 24
    const gridW = w - padding*2
    const gridH = h - 120
    const cellW = Math.floor(gridW / cols)
    const cellH = Math.floor(gridH / rows)

    // draw cells with thumbnail if possible
    cells.forEach(cell => {
      const x = padding + cell.c * cellW + cellW/2
      const y = 64 + cell.r * cellH + cellH/2
      const boxW = Math.max(64, cellW-12)
      const boxH = Math.max(48, cellH-12)
      const sampleKey = (cell.meta && cell.meta.variant) ? (`bg_near_${cell.id}_${cell.meta.variant}`) : null
      const fallbackKey = (localStorage && localStorage.getItem('bgVariant')) ? (`bg_near_${localStorage.getItem('bgVariant')}`) : 'bg_near'
      const thumbKey = sampleKey && this.textures.exists(sampleKey) ? sampleKey : (this.textures.exists(fallbackKey) ? fallbackKey : null)
      if (thumbKey) {
        const img = this.add.image(x, y, thumbKey).setDisplaySize(boxW, boxH).setOrigin(0.5)
        img.setInteractive()
        img.setStrokeStyle && img.setStrokeStyle(2, 0x88ccd8)
      } else {
        const rect = this.add.rectangle(x, y, boxW, boxH, 0x0b3a4a).setStrokeStyle(2, 0x88ccd8)
        rect.setInteractive()
      }
      const label = this.add.text(x, y - boxH/2 + 8, cell.id, { font: '12px Arial', color: '#fff' }).setOrigin(0.5, 0)
      const neigh = cell.meta && cell.meta.neighbors ? Object.keys(cell.meta.neighbors).join(',') : ''
      this.add.text(x, y + boxH/2 - 18, neigh, { font: '11px Arial', color: '#cce' }).setOrigin(0.5, 0)

      this.input.once('gameobjectdown', (pointer: any, obj: any) => {
        // if clicked this object's bounding box contains pointer, start scene
      })

      this.input.hitAreaCallback = this.input.hitAreaCallback

      // attach interactive handler via zone
      const zone = this.add.zone(x, y, boxW, boxH).setOrigin(0.5).setInteractive()
      zone.on('pointerdown', () => {
        try {
          if (!this.scene.get('MainScene')) {
            import('./MainScene').then((m:any) => {
              if (!this.scene.get('MainScene')) this.scene.add('MainScene', m.default, false)
              this.scene.start('MainScene', { startScreenId: cell.id })
            })
          } else {
            this.scene.start('MainScene', { startScreenId: cell.id })
          }
        } catch (e) {}
      })
    })

    // back button
    const back = this.add.text(12, 12, t('back') || 'Back', { font: '14px Arial', color: '#fff', backgroundColor: 'rgba(0,0,0,0.4)', padding: { x:8, y:6 } }).setInteractive()
    back.on('pointerdown', () => { this.scene.start('MenuScene') })
  }
}
