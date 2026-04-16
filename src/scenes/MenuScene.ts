import type Phaser from 'phaser'
import { t, setLocale, getLocale } from '../i18n'

export default class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MenuScene' })
  }

  create() {
    const w = this.scale.width
    const h = this.scale.height
    this.cameras.main.setBackgroundColor('#081026')
    this.add.text(w / 2, 120, t('title'), { font: '36px Arial', color: '#fff' }).setOrigin(0.5)

    const btn = this.add.rectangle(w / 2, h / 2, 260, 64, 0x1e90ff).setInteractive()
    const label = this.add.text(w / 2, h / 2, t('start'), { font: '22px Arial', color: '#fff' }).setOrigin(0.5)

    btn.on('pointerdown', async () => {
      // lazy-load main scene bundle with debug logging
      console.log('Menu: Start pressed, attempting dynamic import of MainScene')
      try {
        const mod = await import('./MainScene')
        console.log('Menu: MainScene module imported')
        if (!this.scene.get('MainScene')) this.scene.add('MainScene', mod.default, false)
        this.scene.start('MainScene')
      } catch (err) {
        console.error('Menu: Failed to import MainScene', err)
      }
    })

    const editorBtn = this.add.rectangle(w / 2, h / 2 + 96, 220, 52, 0x2ecc71).setInteractive()
    this.add.text(w / 2, h / 2 + 96, t('levelEditor'), { font: '18px Arial', color: '#fff' }).setOrigin(0.5)
    editorBtn.on('pointerdown', async () => {
      // lazy-load editor scene bundle
      const mod = await import('./EditorScene')
      if (!this.scene.get('EditorScene')) this.scene.add('EditorScene', mod.default, false)
      this.scene.start('EditorScene')
    })

    // language selector (simple)
    const lang = getLocale() || 'en'
    const langLabel = this.add.text(w - 120, 18, t('language') + ':', { font: '14px Arial', color: '#fff' }).setOrigin(0, 0)
    const btnEn = this.add.text(w - 60, 18, t('lang_en'), { font: '14px Arial', color: lang === 'en' ? '#000' : '#fff', backgroundColor: lang === 'en' ? '#fff' : 'transparent', padding: { x: 6, y: 4 } }).setInteractive()
    const btnEs = this.add.text(w - 30, 18, t('lang_es'), { font: '14px Arial', color: lang === 'es' ? '#000' : '#fff', backgroundColor: lang === 'es' ? '#fff' : 'transparent', padding: { x: 6, y: 4 } }).setInteractive()
    btnEn.on('pointerdown', () => { setLocale('en'); this.scene.restart() })
    btnEs.on('pointerdown', () => { setLocale('es'); this.scene.restart() })

    // simple credits
    this.add.text(w / 2, h - 40, t('credits'), { font: '14px Arial', color: '#cccccc' }).setOrigin(0.5)
  }
}
