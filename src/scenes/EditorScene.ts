import type Phaser from 'phaser'

type Platform = { x: number; y: number; width: number; height: number }
type Item = { x: number; y: number; type: string }

export default class EditorScene extends Phaser.Scene {
  private platforms: Platform[] = []
  private items: Item[] = []
  private drawing: boolean = false
  private drawStart: { x: number; y: number } | null = null
  private preview!: Phaser.GameObjects.Rectangle

  constructor() {
    super({ key: 'EditorScene' })
  }

  create() {
    const w = this.scale.width
    const h = this.scale.height
    this.cameras.main.setBackgroundColor('#071020')

    this.add.text(16, 16, 'Level Editor — Drag to create platforms, click to add item', { font: '16px Arial', color: '#fff' })

    // preview rect
    this.preview = this.add.rectangle(0, 0, 2, 2, 0x66ccff, 0.35).setVisible(false)

    // pointers
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (p.rightButtonDown()) return
      this.drawing = true
      this.drawStart = { x: p.worldX, y: p.worldY }
      this.preview.setVisible(true)
      this.preview.setPosition(p.worldX, p.worldY)
      this.preview.setSize(2, 2)
    })

    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (!this.drawing || !this.drawStart) return
      const sx = this.drawStart.x
      const sy = this.drawStart.y
      const wRect = Math.abs(p.worldX - sx)
      const hRect = Math.abs(p.worldY - sy)
      const cx = (p.worldX + sx) / 2
      const cy = (p.worldY + sy) / 2
      this.preview.setPosition(cx, cy)
      this.preview.setSize(wRect, hRect)
    })

    this.input.on('pointerup', (p: Phaser.Input.Pointer) => {
      if (!this.drawing || !this.drawStart) return
      const sx = this.drawStart.x
      const sy = this.drawStart.y
      const wRect = Math.abs(p.worldX - sx)
      const hRect = Math.abs(p.worldY - sy)
      const cx = (p.worldX + sx) / 2
      const cy = (p.worldY + sy) / 2
      // ignore tiny rectangles
      if (wRect > 10 && hRect > 6) {
        this.platforms.push({ x: cx, y: cy, width: wRect, height: hRect })
        this.add.rectangle(cx, cy, wRect, hRect, 0x444444)
      } else {
        // treat as click => place item
        this.items.push({ x: p.worldX, y: p.worldY, type: 'collect' })
        this.add.circle(p.worldX, p.worldY, 8, 0xff66aa)
      }

      this.drawing = false
      this.drawStart = null
      this.preview.setVisible(false)
    })

    // UI buttons (export / import / clear / back)
    const exportBtn = this.add.rectangle(w - 140, 40, 120, 40, 0x1e90ff).setInteractive()
    this.add.text(w - 140, 40, 'Export JSON', { font: '14px Arial', color: '#fff' }).setOrigin(0.5)
    exportBtn.on('pointerdown', () => this.exportLevel())

    const importBtn = this.add.rectangle(w - 140, 100, 120, 40, 0x2ecc71).setInteractive()
    this.add.text(w - 140, 100, 'Import JSON', { font: '14px Arial', color: '#fff' }).setOrigin(0.5)
    importBtn.on('pointerdown', () => this.importLevel())

    const clearBtn = this.add.rectangle(w - 140, 160, 120, 40, 0xe74c3c).setInteractive()
    this.add.text(w - 140, 160, 'Clear', { font: '14px Arial', color: '#fff' }).setOrigin(0.5)
    clearBtn.on('pointerdown', () => this.clearLevel())

    const backBtn = this.add.rectangle(w - 140, h - 40, 120, 40, 0x888888).setInteractive()
    this.add.text(w - 140, h - 40, 'Back', { font: '14px Arial', color: '#fff' }).setOrigin(0.5)
    backBtn.on('pointerdown', () => this.scene.start('MenuScene'))
  }

  exportLevel() {
    const level = {
      name: 'Custom Level',
      platforms: this.platforms,
      items: this.items,
      playerStart: { x: 80, y: 500 }
    }
    const blob = new Blob([JSON.stringify(level, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'level-custom.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  importLevel() {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json,application/json'
    input.onchange = async (e: any) => {
      const file = e.target.files[0]
      if (!file) return
      const text = await file.text()
      try {
        const parsed = JSON.parse(text)
        this.clearLevel()
        if (parsed.platforms) parsed.platforms.forEach((p: any) => {
          this.platforms.push(p)
          this.add.rectangle(p.x, p.y, p.width, p.height, 0x444444)
        })
        if (parsed.items) parsed.items.forEach((it: any) => {
          this.items.push(it)
          this.add.circle(it.x, it.y, 8, 0xff66aa)
        })
      } catch (err) {
        console.warn('Invalid JSON', err)
      }
    }
    input.click()
  }

  clearLevel() {
    this.platforms = []
    this.items = []
    this.scene.restart()
  }
}
