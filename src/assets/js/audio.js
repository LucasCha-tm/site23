/**
 * Moteur audio commun (effets sonores + musique d'ambiance).
 * Tout est généré en direct avec WebAudio : aucun fichier audio, aucun droit d'auteur.
 */

import { soundsEnabled, volume, musicEnabled, musicVolume } from './prefs.js'

let A = null
let gameRunning = false
let gestureBound = false
let noise = null

export function getAudio() {
    if (A) {
        if (A.ctx.state === 'suspended') A.ctx.resume().catch(() => {})
        return A
    }

    let ctx
    try {
        ctx = new (window.AudioContext || window.webkitAudioContext)()
    } catch (e) {
        return null
    }

    const comp = ctx.createDynamicsCompressor()
    comp.threshold.value = -14
    comp.knee.value = 20
    comp.ratio.value = 4
    comp.connect(ctx.destination)

    const sfxBus = ctx.createGain()
    sfxBus.connect(comp)
    const musicBus = ctx.createGain()
    musicBus.connect(comp)

    // Réverbération (réponse impulsionnelle générée : bruit qui s'éteint)
    const len = Math.floor(ctx.sampleRate * 2.4)
    const ir = ctx.createBuffer(2, len, ctx.sampleRate)
    for (let ch = 0; ch < 2; ch++) {
        const d = ir.getChannelData(ch)
        for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3)
    }
    const conv = ctx.createConvolver()
    conv.buffer = ir
    const reverbIn = ctx.createGain()
    const wet = ctx.createGain()
    wet.gain.value = 0.55
    reverbIn.connect(conv)
    conv.connect(wet)
    wet.connect(comp)

    const sfxSend = ctx.createGain()
    sfxSend.gain.value = 0.12
    sfxBus.connect(sfxSend)
    sfxSend.connect(reverbIn)

    const musicSend = ctx.createGain()
    musicSend.gain.value = 0.35
    musicBus.connect(musicSend)
    musicSend.connect(reverbIn)

    A = { ctx, sfxBus, musicBus, reverbIn }
    refreshVolumes()

    // Les navigateurs démarrent l'audio « en pause » tant qu'il n'y a pas eu de clic
    if (!gestureBound) {
        gestureBound = true
        for (const ev of ['pointerdown', 'keydown']) {
            window.addEventListener(ev, () => {
                if (A && A.ctx.state === 'suspended') A.ctx.resume().catch(() => {})
            }, { passive: true })
        }
    }

    return A
}

export function refreshVolumes() {
    if (!A) return
    const t = A.ctx.currentTime
    A.sfxBus.gain.setTargetAtTime(soundsEnabled() && !gameRunning ? volume() * 1.6 : 0, t, 0.05)
    A.musicBus.gain.setTargetAtTime(musicEnabled() && !gameRunning ? musicVolume() * 1.3 : 0, t, 0.1)
}

export function isGameRunning() {
    return gameRunning
}

/**
 * Pendant que Minecraft tourne, le launcher se tait : la musique et les sons
 * sont coupés (fondu), l'audio est suspendu, et les animations s'arrêtent.
 * Tout reprend à la fermeture du jeu.
 */
export function setGameRunning(value) {
    value = Boolean(value)
    if (value === gameRunning) return
    gameRunning = value

    if (A) {
        refreshVolumes()
        if (value) {
            setTimeout(() => {
                if (gameRunning && A) A.ctx.suspend().catch(() => {})
            }, 700)
        } else {
            A.ctx.resume().catch(() => {})
        }
    }

    // Prévient la musique et les animations (elles écoutent cet événement)
    window.dispatchEvent(new CustomEvent('site23-prefs', { detail: { name: 'game', value } }))
}

export function noiseBuf(ctx) {
    if (!noise) {
        const len = Math.floor(ctx.sampleRate)
        noise = ctx.createBuffer(1, len, ctx.sampleRate)
        const d = noise.getChannelData(0)
        for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1
    }
    return noise
}

/** Envoie un nœud vers les effets sonores (sec + un peu de réverbération). */
export function sfxOut(a, node, wet = 0) {
    node.connect(a.sfxBus)
    if (wet > 0) {
        const w = a.ctx.createGain()
        w.gain.value = wet * Math.max(0.2, a.sfxBus.gain.value)
        node.connect(w)
        w.connect(a.reverbIn)
    }
}