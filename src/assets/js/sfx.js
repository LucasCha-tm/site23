/**
 * Effets sonores du launcher : bruitages de terminal / de badge d'accès,
 * avec une variante par événement (cloches de Noël, orgue d'Halloween...).
 * Tout est synthétisé en direct, sans aucun fichier audio.
 */

import { soundsEnabled, getPref } from './prefs.js'
import { getAudio, noiseBuf, sfxOut, refreshVolumes, isGameRunning } from './audio.js'

let eventKey = ''
let ready = false

export function setEventSound(key) {
    eventKey = key || ''
}

function env(g, t, a, peak, d) {
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t + a)
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + d)
}

function osc(A, t, { f, to = null, d = 0.1, type = 'sine', g = 0.3, a = 0.004, at = 0, wet = 0.15, cut = 0 }) {
    const s = t + at
    const o = A.ctx.createOscillator()
    const e = A.ctx.createGain()
    o.type = type
    o.frequency.setValueAtTime(f, s)
    if (to) o.frequency.exponentialRampToValueAtTime(to, s + d)
    env(e, s, a, g, d)
    let n = o
    if (cut) {
        const lp = A.ctx.createBiquadFilter()
        lp.type = 'lowpass'
        lp.frequency.value = cut
        o.connect(lp)
        n = lp
    }
    n.connect(e)
    sfxOut(A, e, wet)
    o.start(s)
    o.stop(s + a + d + 0.05)
}

function noise(A, t, { d = 0.05, g = 0.3, type = 'bandpass', f = 2000, to = null, q = 1, a = 0.002, at = 0, wet = 0.1 }) {
    const s = t + at
    const src = A.ctx.createBufferSource()
    src.buffer = noiseBuf(A.ctx)
    src.loop = true
    const flt = A.ctx.createBiquadFilter()
    flt.type = type
    flt.frequency.setValueAtTime(f, s)
    if (to) flt.frequency.exponentialRampToValueAtTime(to, s + d)
    flt.Q.value = q
    const e = A.ctx.createGain()
    env(e, s, a, g, d)
    src.connect(flt)
    flt.connect(e)
    sfxOut(A, e, wet)
    src.start(s)
    src.stop(s + a + d + 0.05)
}

const R = {
    // Bruitages de base : terminal et badge d'accès
    base: {
        // Touche mécanique : claquement + petit « thump » + tic aigu
        click: (A, t) => {
            noise(A, t, { d: 0.03, g: 0.45, f: 3400, q: 1.4, wet: 0.05 })
            osc(A, t, { f: 190, to: 80, d: 0.08, g: 0.5, wet: 0 })
            osc(A, t, { f: 2600, to: 1900, d: 0.03, type: 'square', g: 0.12, wet: 0.05 })
        },
        // Navigation : souffle montant + double bip
        nav: (A, t) => {
            noise(A, t, { d: 0.2, g: 0.28, f: 500, to: 3200, q: 0.8, a: 0.02, wet: 0.15 })
            osc(A, t, { f: 740, d: 0.1, type: 'triangle', g: 0.28, at: 0.04 })
            osc(A, t, { f: 1110, d: 0.14, type: 'triangle', g: 0.24, at: 0.1, wet: 0.25 })
        },
        // Retour : souffle descendant
        back: (A, t) => {
            noise(A, t, { d: 0.18, g: 0.25, f: 3000, to: 500, q: 0.8, a: 0.01, wet: 0.15 })
            osc(A, t, { f: 620, to: 310, d: 0.16, type: 'triangle', g: 0.3 })
        },
        // Jouer : « accès accordé » (grondement, carillon, impact)
        play: (A, t) => {
            osc(A, t, { f: 60, to: 130, d: 0.7, type: 'sawtooth', g: 0.28, a: 0.15, cut: 300, wet: 0.2 })
            noise(A, t, { d: 0.6, g: 0.22, f: 400, to: 5000, q: 1, a: 0.3, wet: 0.3 })
            osc(A, t, { f: 784, d: 0.5, type: 'triangle', g: 0.3, at: 0.15, wet: 0.5 })
            osc(A, t, { f: 988, d: 0.5, type: 'triangle', g: 0.3, at: 0.27, wet: 0.5 })
            osc(A, t, { f: 1319, d: 0.7, type: 'triangle', g: 0.3, at: 0.39, wet: 0.6 })
            osc(A, t, { f: 120, to: 45, d: 0.35, g: 0.6, at: 0.45, wet: 0.2 })
            noise(A, t, { d: 0.2, g: 0.3, f: 900, q: 0.8, at: 0.45, wet: 0.2 })
        }
    },

    christmas: {
        // Clochettes de traîneau
        click: (A, t) => {
            for (const at of [0, 0.02, 0.05]) osc(A, t, { f: 3200 + at * 6000, d: 0.25, g: 0.12, at, wet: 0.4 })
            osc(A, t, { f: 1976, d: 0.35, g: 0.22, wet: 0.5 })
            noise(A, t, { d: 0.12, g: 0.12, type: 'highpass', f: 6000, wet: 0.3 })
        },
        play: (A, t) => {
            ;[1047, 1319, 1568, 2093].forEach((f, i) => osc(A, t, { f, d: 0.6, g: 0.25, at: i * 0.09, wet: 0.6 }))
            noise(A, t, { d: 0.5, g: 0.14, type: 'highpass', f: 5500, a: 0.1, wet: 0.4 })
            osc(A, t, { f: 110, to: 55, d: 0.3, g: 0.4, at: 0.3, wet: 0.2 })
        }
    },

    halloween: {
        // Grincement
        click: (A, t) => {
            osc(A, t, { f: 150, to: 95, d: 0.16, type: 'sawtooth', g: 0.28, cut: 500, wet: 0.3 })
            noise(A, t, { d: 0.1, g: 0.15, f: 900, q: 3, wet: 0.3 })
        },
        // Accord d'orgue + cri de chauve-souris
        play: (A, t) => {
            ;[110, 131, 165, 220].forEach(f => osc(A, t, { f, d: 0.9, type: 'sawtooth', g: 0.2, a: 0.05, cut: 700, wet: 0.5 }))
            osc(A, t, { f: 3000, to: 5200, d: 0.25, g: 0.12, at: 0.15, wet: 0.4 })
            osc(A, t, { f: 70, to: 40, d: 0.4, g: 0.5, wet: 0.2 })
        }
    },

    easter: {
        // Xylophone
        click: (A, t) => {
            osc(A, t, { f: 880, d: 0.18, g: 0.35, wet: 0.2 })
            osc(A, t, { f: 3520, d: 0.05, g: 0.12, wet: 0.1 })
        },
        play: (A, t) => {
            ;[1047, 1319, 1568, 2093].forEach((f, i) => {
                osc(A, t, { f, d: 0.25, g: 0.3, at: i * 0.07, wet: 0.3 })
                osc(A, t, { f: f * 4, d: 0.05, g: 0.1, at: i * 0.07, wet: 0.1 })
            })
        }
    },

    newyear: {
        // Étincelle
        click: (A, t) => {
            noise(A, t, { d: 0.04, g: 0.3, type: 'highpass', f: 4500, q: 0.8, wet: 0.1 })
            osc(A, t, { f: 1568, to: 2093, d: 0.1, type: 'triangle', g: 0.2, wet: 0.4 })
        },
        // Bouchon de champagne + arpège scintillant
        play: (A, t) => {
            noise(A, t, { d: 0.12, g: 0.4, f: 1200, q: 0.7, wet: 0.2 })
            ;[1047, 1319, 1568, 2093, 2637].forEach((f, i) => osc(A, t, { f, d: 0.3, type: 'triangle', g: 0.22, at: 0.1 + i * 0.06, wet: 0.5 }))
            noise(A, t, { d: 0.5, g: 0.1, type: 'highpass', f: 7000, at: 0.15, wet: 0.3 })
        }
    },

    valentine: {
        // Battement de cœur + petit carillon
        click: (A, t) => {
            osc(A, t, { f: 90, to: 55, d: 0.12, g: 0.4, wet: 0 })
            osc(A, t, { f: 880, to: 1175, d: 0.12, g: 0.3, wet: 0.4 })
        },
        play: (A, t) => {
            osc(A, t, { f: 80, to: 40, d: 0.15, g: 0.55, wet: 0.1 })
            osc(A, t, { f: 80, to: 40, d: 0.18, g: 0.45, at: 0.18, wet: 0.1 })
            ;[1319, 1568, 1976].forEach((f, i) => osc(A, t, { f, d: 0.5, g: 0.25, at: 0.3 + i * 0.1, wet: 0.6 }))
        }
    }
}

export function play(kind = 'click') {
    if (!soundsEnabled() || isGameRunning()) return
    const A = getAudio()
    if (!A) return
    refreshVolumes()
    const t = A.ctx.currentTime + 0.01
    const fn = (R[eventKey] && R[eventKey][kind]) || R.base[kind] || R.base.click
    fn(A, t)
}

const CLICKABLE = [
    '.play-instance', '.instance-select', '.instance-elements', '.close-popup',
    '.rail-link', '.settings-btn', '.social-block',
    '.nav-settings-btn', '.theme-btn', '.close-btn', '.fx-btn',
    '.java-path-btn', '.size-btn', '.max-files-btn', '.account', '.delete-profile', '.popup-button'
].join(', ')

export function initSfx() {
    if (ready) return
    ready = true
    window.site23Sfx = play // test : site23Sfx('play') dans la console

    document.addEventListener('click', e => {
        const el = e.target.closest ? e.target.closest(CLICKABLE) : null
        if (!el) return

        if (el.matches('.play-instance')) return play('play')
        if (el.matches('#save, .rail-home, .close-popup')) return play('back')
        if (el.matches('.nav-settings-btn, .rail-link, .settings-btn')) return play('nav')
        play('click')
    })
}