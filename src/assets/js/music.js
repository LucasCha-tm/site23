/**
 * Musique d'ambiance par événement, composée et jouée en direct (WebAudio).
 *  - Noël : « Jingle Bells » et « We Wish You a Merry Christmas » (chants traditionnels,
 *    domaine public), joués à la boîte à musique.
 *  - Halloween, Pâques, Nouvel An, Saint-Valentin : morceaux originaux générés
 *    (accords + mélodie qui varie à chaque tour).
 * Aucun fichier audio : aucun droit d'auteur.
 */

import { musicEnabled } from './prefs.js'
import { getAudio, refreshVolumes, noiseBuf } from './audio.js'

const mtof = m => 440 * Math.pow(2, (m - 69) / 12)
const CH = { maj: [0, 4, 7], min: [0, 3, 7], dom: [0, 4, 7, 10] }
const chordNotes = ([root, q]) => CH[q].map(i => root + i)
const rnd = (a, b) => a + Math.random() * (b - a)
const pick = a => a[Math.floor(Math.random() * a.length)]

/* ------------------------------------------------------------------ */
/*  Voix                                                               */
/* ------------------------------------------------------------------ */

function env(g, t, a, peak, d) {
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t + a)
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + d)
}

// Note à partiels (boîte à musique, cloche, marimba, piano électrique, pizzicato)
function partialsNote(T, t, m, { partials, d, g, a = 0.004, type = 'sine', sweep = null }) {
    const f = mtof(m)
    const e = T.A.ctx.createGain()
    env(e, t, a, g, d)
    let out = e
    if (sweep) {
        const lp = T.A.ctx.createBiquadFilter()
        lp.type = 'lowpass'
        lp.frequency.setValueAtTime(sweep[0], t)
        lp.frequency.exponentialRampToValueAtTime(sweep[1], t + d)
        e.connect(lp)
        out = lp
    }
    out.connect(T.bus)
    for (const [ratio, gain] of partials) {
        const o = T.A.ctx.createOscillator()
        const pg = T.A.ctx.createGain()
        o.type = type
        o.frequency.value = f * ratio
        pg.gain.value = gain
        o.connect(pg)
        pg.connect(e)
        o.start(t)
        o.stop(t + a + d + 0.05)
    }
}

const LEADS = {
    musicbox: (T, t, m, dur) => partialsNote(T, t, m, { partials: [[1, 1], [2, 0.35], [3.01, 0.12]], d: Math.max(dur, 0.9) * 1.2, g: 0.22, a: 0.003 }),
    bell: (T, t, m) => partialsNote(T, t, m, { partials: [[1, 1], [2.76, 0.5], [5.4, 0.25], [8.93, 0.12]], d: 2.4, g: 0.15, a: 0.004 }),
    marimba: (T, t, m) => partialsNote(T, t, m, { partials: [[1, 1], [4, 0.22]], d: 0.5, g: 0.28, a: 0.003 }),
    pluck: (T, t, m) => partialsNote(T, t, m, { partials: [[1, 1], [2, 0.3]], d: 0.45, g: 0.24, a: 0.003, type: 'triangle', sweep: [4000, 700] }),
    epiano: (T, t, m) => partialsNote(T, t, m, { partials: [[1, 1], [2, 0.28], [4, 0.08]], d: 1.5, g: 0.2, a: 0.006 })
}

// Nappe d'accord (deux oscillateurs légèrement désaccordés, filtrés)
function pad(T, t, notes, dur, { type = 'sawtooth', cut = 900, g = 0.05, a = 0.5 }) {
    for (const m of notes) {
        const lp = T.A.ctx.createBiquadFilter()
        lp.type = 'lowpass'
        lp.frequency.value = cut
        const e = T.A.ctx.createGain()
        e.gain.setValueAtTime(0.0001, t)
        e.gain.linearRampToValueAtTime(g, t + a)
        e.gain.setValueAtTime(g, t + Math.max(a, dur - 0.4))
        e.gain.linearRampToValueAtTime(0.0001, t + dur + 0.4)
        lp.connect(e)
        e.connect(T.bus)
        for (const det of [-7, 7]) {
            const o = T.A.ctx.createOscillator()
            o.type = type
            o.frequency.value = mtof(m)
            o.detune.value = det
            o.connect(lp)
            o.start(t)
            o.stop(t + dur + 0.5)
        }
    }
}

function bass(T, t, m, d) {
    const o = T.A.ctx.createOscillator()
    const e = T.A.ctx.createGain()
    o.type = 'sine'
    o.frequency.value = mtof(m)
    env(e, t, 0.01, 0.3, d)
    o.connect(e)
    e.connect(T.bus)
    o.start(t)
    o.stop(t + d + 0.05)
}

function noiseHit(T, t, { d = 0.05, g = 0.06, type = 'highpass', f = 6000, q = 1 }) {
    const src = T.A.ctx.createBufferSource()
    src.buffer = noiseBuf(T.A.ctx)
    src.loop = true
    const flt = T.A.ctx.createBiquadFilter()
    flt.type = type
    flt.frequency.value = f
    flt.Q.value = q
    const e = T.A.ctx.createGain()
    env(e, t, 0.002, g, d)
    src.connect(flt)
    flt.connect(e)
    e.connect(T.bus)
    src.start(t)
    src.stop(t + d + 0.05)
}

function kick(T, t) {
    const o = T.A.ctx.createOscillator()
    const e = T.A.ctx.createGain()
    o.type = 'sine'
    o.frequency.setValueAtTime(120, t)
    o.frequency.exponentialRampToValueAtTime(45, t + 0.12)
    env(e, t, 0.003, 0.4, 0.16)
    o.connect(e)
    e.connect(T.bus)
    o.start(t)
    o.stop(t + 0.25)
}

// Percussions
const PERCS = {
    sleigh: (T, t, beat, meter) => {
        for (let i = 0; i < meter * 2; i++) {
            const at = t + (i * beat) / 2
            noiseHit(T, at, { d: 0.06, g: i % 2 === 0 ? 0.07 : 0.04, f: 6500 })
            if (i % 2 === 0) noiseHit(T, at, { d: 0.05, g: 0.03, type: 'bandpass', f: 4200, q: 6 })
        }
    },
    shaker: (T, t, beat, meter) => {
        for (let i = 0; i < meter * 2; i++) noiseHit(T, t + (i * beat) / 2, { d: 0.04, g: i % 2 ? 0.035 : 0.05, type: 'bandpass', f: 7000, q: 1 })
    },
    beat: (T, t, beat, meter) => {
        for (let i = 0; i < meter; i++) {
            if (i % 2 === 0) kick(T, t + i * beat)
            noiseHit(T, t + i * beat + beat / 2, { d: 0.03, g: 0.06, f: 8000 })
        }
    }
}

// Vent continu (Halloween)
function wind(T) {
    const c = T.A.ctx
    const src = c.createBufferSource()
    src.buffer = noiseBuf(c)
    src.loop = true
    const bp = c.createBiquadFilter()
    bp.type = 'bandpass'
    bp.frequency.value = 520
    bp.Q.value = 0.7
    const lfo = c.createOscillator()
    const lfoGain = c.createGain()
    lfo.frequency.value = 0.07
    lfoGain.gain.value = 260
    lfo.connect(lfoGain)
    lfoGain.connect(bp.frequency)
    const g = c.createGain()
    g.gain.value = 0.05
    src.connect(bp)
    bp.connect(g)
    g.connect(T.bus)
    src.start()
    lfo.start()
    T.cleanups.push(() => {
        try { src.stop(); lfo.stop() } catch (e) { /* déjà arrêtés */ }
    })
}

/* ------------------------------------------------------------------ */
/*  Morceaux                                                           */
/* ------------------------------------------------------------------ */

// Morceau à mélodie fixe : melody = [[note MIDI | null, durée en temps], ...]
function fixedPiece({ bpm, meter, melody, chords, lead, padOpts, perc = null, shift = 0 }) {
    let beat = 0
    const evs = []
    for (const [m, b] of melody) {
        if (m !== null) evs.push({ beat, m: m + shift, dur: b })
        beat += b
    }
    return {
        bpm, meter, lead, padOpts, perc, padShift: 12,
        bars: Math.ceil(beat / meter) + 1,
        chordAt: bar => chords[bar % chords.length],
        melodyAt: bar => evs
            .filter(e => e.beat >= bar * meter && e.beat < (bar + 1) * meter)
            .map(e => ({ off: e.beat - bar * meter, m: e.m, dur: e.dur }))
    }
}

const PATTERNS = [[1, 1, 1, 1], [2, 1, 1], [1, 0.5, 0.5, 2], [0.5, 0.5, 1, 1, 1], [1.5, 0.5, 2], [1, 1, 2], [3, 1], [0.5, 0.5, 0.5, 0.5, 2]]

function scaleNotes(root, pcs, lo, hi) {
    const out = []
    for (let m = lo; m <= hi; m++) if (pcs.includes((((m - root) % 12) + 12) % 12)) out.push(m)
    return out
}

// Morceau généré : accords fixes, mélodie qui change à chaque tour
function genPiece({ bpm, root, scale, lo, hi, chords, lead, padOpts, perc = null, rest = 0.2, bars = 16 }) {
    const notes = scaleNotes(root, scale, lo, hi)
    let idx = Math.floor(notes.length / 2)
    return {
        bpm, meter: 4, bars, lead, padOpts, perc, padShift: 12,
        reset() { idx = Math.floor(notes.length / 2) },
        chordAt: bar => chords[bar % chords.length],
        melodyAt(bar) {
            const tones = chordNotes(chords[bar % chords.length]).map(n => n % 12)
            const evs = []
            let off = 0
            pick(PATTERNS).forEach((d, i) => {
                if (i > 0 && Math.random() < rest) { off += d; return }
                idx = Math.max(0, Math.min(notes.length - 1, idx + pick([-2, -1, -1, 0, 1, 1, 2])))
                if (i === 0 || (off % 2 === 0 && Math.random() < 0.5)) {
                    let best = idx
                    let bd = 99
                    for (let k = Math.max(0, idx - 3); k <= Math.min(notes.length - 1, idx + 3); k++) {
                        if (tones.includes(notes[k] % 12) && Math.abs(k - idx) < bd) { bd = Math.abs(k - idx); best = k }
                    }
                    idx = best
                }
                evs.push({ off, m: notes[idx], dur: d })
                off += d
            })
            return evs
        }
    }
}

const C = 48, F = 53, G = 55, D = 50

const TRACKS = {
    // Chants traditionnels (domaine public)
    christmas: {
        pieces: [
            fixedPiece({
                bpm: 112, meter: 4, lead: 'musicbox', perc: 'sleigh', shift: 12,
                padOpts: { type: 'triangle', cut: 1500, g: 0.05, a: 0.4 },
                chords: [[C, 'maj'], [C, 'maj'], [C, 'maj'], [C, 'maj'], [F, 'maj'], [C, 'maj'], [G, 'dom'], [G, 'dom'],
                    [C, 'maj'], [C, 'maj'], [C, 'maj'], [C, 'maj'], [F, 'maj'], [C, 'maj'], [G, 'dom'], [C, 'maj']],
                melody: [
                    [64, 1], [64, 1], [64, 2], [64, 1], [64, 1], [64, 2], [64, 1], [67, 1], [60, 1.5], [62, 0.5], [64, 4],
                    [65, 1], [65, 1], [65, 1.5], [65, 0.5], [65, 1], [64, 1], [64, 1], [64, 0.5], [64, 0.5], [64, 1], [62, 1], [62, 1], [64, 1], [62, 2], [67, 2],
                    [64, 1], [64, 1], [64, 2], [64, 1], [64, 1], [64, 2], [64, 1], [67, 1], [60, 1.5], [62, 0.5], [64, 4],
                    [65, 1], [65, 1], [65, 1.5], [65, 0.5], [65, 1], [64, 1], [64, 1], [64, 0.5], [64, 0.5], [67, 1], [67, 1], [65, 1], [62, 1], [60, 4]
                ]
            }),
            fixedPiece({
                bpm: 120, meter: 3, lead: 'musicbox', perc: 'sleigh', shift: 12,
                padOpts: { type: 'triangle', cut: 1500, g: 0.05, a: 0.4 },
                chords: [[43, 'maj'], [43, 'maj'], [C, 'maj'], [D, 'maj'], [D, 'maj'], [43, 'maj'], [C, 'maj'], [D, 'maj'], [43, 'maj']],
                melody: [
                    [null, 2], [62, 1],
                    [67, 1], [67, 0.5], [69, 0.5], [67, 0.5], [66, 0.5], [64, 1], [64, 1], [64, 1],
                    [69, 1], [69, 0.5], [71, 0.5], [69, 0.5], [67, 0.5], [66, 1], [62, 1], [62, 1],
                    [71, 1], [71, 0.5], [72, 0.5], [71, 0.5], [69, 0.5], [67, 1], [64, 1], [62, 0.5], [62, 0.5],
                    [64, 1], [69, 1], [66, 1], [67, 3]
                ]
            })
        ]
    },

    // Original : la mineur harmonique, cloches, vent, nappe sombre
    halloween: {
        ambient: wind,
        pieces: [genPiece({
            bpm: 68, root: 57, scale: [0, 2, 3, 5, 7, 8, 11], lo: 69, hi: 88, lead: 'bell', rest: 0.35,
            chords: [[45, 'min'], [45, 'min'], [41, 'maj'], [40, 'maj']],
            padOpts: { type: 'sawtooth', cut: 600, g: 0.05, a: 0.8 }
        })]
    },

    // Original : marimba et shaker, ambiance printanière
    easter: {
        pieces: [genPiece({
            bpm: 116, root: 60, scale: [0, 2, 4, 7, 9], lo: 72, hi: 91, lead: 'marimba', perc: 'shaker', rest: 0.2,
            chords: [[48, 'maj'], [55, 'maj'], [45, 'min'], [53, 'maj']],
            padOpts: { type: 'triangle', cut: 1600, g: 0.05, a: 0.3 }
        })]
    },

    // Original : arpèges pincés et rythme de fête
    newyear: {
        pieces: [genPiece({
            bpm: 124, root: 62, scale: [0, 2, 4, 5, 7, 9, 11], lo: 74, hi: 93, lead: 'pluck', perc: 'beat', rest: 0.1,
            chords: [[50, 'maj'], [57, 'maj'], [47, 'min'], [55, 'maj']],
            padOpts: { type: 'sawtooth', cut: 2000, g: 0.035, a: 0.2 }
        })]
    },

    // Original : piano électrique lent et nappe douce
    valentine: {
        pieces: [genPiece({
            bpm: 68, root: 60, scale: [0, 2, 4, 5, 7, 9, 11], lo: 67, hi: 88, lead: 'epiano', rest: 0.3,
            chords: [[45, 'min'], [41, 'maj'], [48, 'maj'], [43, 'maj']],
            padOpts: { type: 'triangle', cut: 1100, g: 0.06, a: 0.8 }
        })]
    }
}

/* ------------------------------------------------------------------ */
/*  Lecteur                                                            */
/* ------------------------------------------------------------------ */

let currentKey = null
let track = null
let timer = 0
let nextTime = 0
let pieceIdx = 0
let bar = 0
let bound = false

function scheduleBar(piece, b, t) {
    const beat = 60 / piece.bpm
    const chord = piece.chordAt(b)

    pad(track, t, chordNotes(chord).map(n => n + piece.padShift), beat * piece.meter, piece.padOpts)
    bass(track, t, chord[0], beat * 1.8)
    if (piece.meter === 4) bass(track, t + beat * 2, chord[0] + 7, beat * 1.4)

    for (const ev of piece.melodyAt(b)) LEADS[piece.lead](track, t + ev.off * beat, ev.m, ev.dur * beat)
    if (piece.perc) PERCS[piece.perc](track, t, beat, piece.meter)
}

function tick() {
    if (!track) return
    const now = track.A.ctx.currentTime
    while (nextTime < now + 1.0) {
        const piece = track.def.pieces[pieceIdx % track.def.pieces.length]
        if (bar === 0 && piece.reset) piece.reset()
        scheduleBar(piece, bar, nextTime)
        nextTime += (60 / piece.bpm) * piece.meter
        bar++
        if (bar >= piece.bars) {
            bar = 0
            pieceIdx++
        }
    }
}

function startTrack(key) {
    const A = getAudio()
    if (!A) return
    const bus = A.ctx.createGain()
    const t = A.ctx.currentTime
    bus.gain.setValueAtTime(0.0001, t)
    bus.gain.exponentialRampToValueAtTime(1, t + 2.5)
    bus.connect(A.musicBus)

    track = { key, def: TRACKS[key], A, bus, cleanups: [] }
    pieceIdx = 0
    bar = 0
    nextTime = t + 0.15
    if (track.def.ambient) track.def.ambient(track)
    tick()
    timer = setInterval(tick, 200)
}

function stopTrack() {
    if (!track) return
    clearInterval(timer)
    const old = track
    track = null
    const t = old.A.ctx.currentTime
    old.bus.gain.cancelScheduledValues(t)
    old.bus.gain.setValueAtTime(Math.max(old.bus.gain.value, 0.0001), t)
    old.bus.gain.exponentialRampToValueAtTime(0.0001, t + 1.2)
    setTimeout(() => {
        old.cleanups.forEach(fn => fn())
        try { old.bus.disconnect() } catch (e) { /* déjà déconnecté */ }
    }, 1500)
}

function sync() {
    const should = currentKey && TRACKS[currentKey] && musicEnabled()
    if (!should) return stopTrack()
    if (track && track.key === currentKey) return
    stopTrack()
    startTrack(currentKey)
}

/** Lance la musique de l'événement (null = arrêt). */
export function setMusicEvent(key) {
    currentKey = key || null
    if (!bound) {
        bound = true
        window.addEventListener('site23-prefs', () => {
            refreshVolumes()
            sync()
        })
    }
    sync()
}