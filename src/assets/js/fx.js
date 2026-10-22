/**
 * Événements saisonniers (Noël, Halloween, Pâques...) : couleurs, décor,
 * animation de particules et bandeau.
 * L'événement actif se choisit sur le site : Admin > Tablette carcérale > Événements.
 *
 * Fond personnalisé (optionnel) : déposer une image nommée comme l'événement
 * (christmas, halloween, easter, newyear, valentine) en .jpg, .png ou .webp
 * dans src/assets/images/events/ : elle remplace le décor dessiné.
 *
 * Test rapide sans passer par le site : ouvrir la console (Ctrl+Maj+I) et taper
 *     site23Event('christmas')      puis      site23Event(null)
 */

import { animationsEnabled } from './prefs.js'
import { setEventSound } from './sfx.js'
import { setMusicEvent } from './music.js'
import { ART, garland } from './event-art.js'

const nodeFetch = require('node-fetch')
const fs = require('fs')

const SITE_URL = 'https://site23.alwaysdata.net'

const THEMES = {
    christmas: { banner: 'Protocole hivernal en vigueur · Joyeuses fêtes, personnel', particles: 'snow' },
    halloween: { banner: 'Alerte : brèche de confinement · Bonne nuit d’Halloween', particles: 'embers' },
    easter: { banner: 'Chasse aux anomalies : œufs détectés sur le site', particles: 'eggs' },
    newyear: { banner: 'Redémarrage du cycle · Bonne année', particles: 'confetti' },
    valentine: { banner: 'Anomalie affective détectée · Joyeuse Saint-Valentin', particles: 'hearts' }
}

const COUNTS = { snow: 90, embers: 55, eggs: 26, confetti: 70, hearts: 30 }

let started = false
let current = null
let bgEl, canvas, c2d, bannerEl
let particles = []
let rafId = 0
let lastTime = 0
let nextBat = 0
let kind = ''

/* Les décors dessinés (SVG) sont dans event-art.js */

function customImage(key) {
    for (const ext of ['jpg', 'png', 'webp']) {
        if (fs.existsSync(`${__dirname}/assets/images/events/${key}.${ext}`)) return `./assets/images/events/${key}.${ext}`
    }
    return null
}

/* ------------------------------------------------------------------ */
/*  Particules (canvas)                                                */
/* ------------------------------------------------------------------ */

const rand = (a, b) => a + Math.random() * (b - a)
const PASTELS = ['#b9a3c9', '#9fc4b5', '#d8cfa0', '#a3b8d1']
const CONFETTI = ['#ffd45c', '#e8c44a', '#ffffff']
const HEARTS = ['#c2304f', '#e0506f', '#8f1f3a']

function resize() {
    if (!canvas) return
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight
}

function spawn(k, initial) {
    const w = canvas.width
    const h = canvas.height
    switch (k) {
        case 'snow':
            return { x: rand(0, w), y: initial ? rand(0, h) : rand(-20, -5), r: rand(1.2, 3.6), vy: rand(0.5, 1.4), sw: rand(0, 6.28) }
        case 'embers':
            return { x: rand(0, w), y: initial ? rand(0, h) : h + 10, r: rand(1, 2.8), vy: -rand(0.4, 1.4), sw: rand(0, 6.28), hue: rand(18, 42), a: rand(0.35, 0.9) }
        case 'eggs':
            return { x: rand(0, w), y: initial ? rand(0, h) : rand(-30, -10), r: rand(6, 10), vy: rand(0.6, 1.2), sw: rand(0, 6.28), rot: rand(0, 6.28), vr: rand(-0.02, 0.02), c: PASTELS[Math.floor(rand(0, PASTELS.length))] }
        case 'confetti':
            return { x: rand(0, w), y: initial ? rand(0, h) : rand(-20, -5), r: rand(3, 6), vy: rand(1, 2.4), sw: rand(0, 6.28), rot: rand(0, 6.28), vr: rand(-0.12, 0.12), c: CONFETTI[Math.floor(rand(0, CONFETTI.length))] }
        case 'hearts':
            return { x: rand(0, w), y: initial ? rand(0, h) : h + 20, r: rand(7, 14), vy: -rand(0.5, 1.1), sw: rand(0, 6.28), a: rand(0.3, 0.6), c: HEARTS[Math.floor(rand(0, HEARTS.length))] }
    }
}

function spawnBat() {
    return { bat: true, x: -40, y: rand(canvas.height * 0.1, canvas.height * 0.5), s: rand(14, 22), vx: rand(1.6, 3), flap: 0, base: 0 }
}

function drawBat(p) {
    const f = Math.sin(p.flap)
    c2d.save()
    c2d.translate(p.x, p.y)
    c2d.fillStyle = 'rgba(8,4,12,0.9)'
    for (const side of [1, -1]) {
        c2d.save()
        c2d.scale(side, 1)
        c2d.beginPath()
        c2d.moveTo(0, 0)
        c2d.quadraticCurveTo(p.s * 0.5, -p.s * 0.8 * f, p.s, -p.s * 0.15 * f)
        c2d.quadraticCurveTo(p.s * 0.65, p.s * 0.2, p.s * 0.35, p.s * 0.1)
        c2d.quadraticCurveTo(p.s * 0.2, p.s * 0.3, 0, p.s * 0.28)
        c2d.fill()
        c2d.restore()
    }
    c2d.beginPath()
    c2d.arc(0, 0, p.s * 0.14, 0, Math.PI * 2)
    c2d.fill()
    c2d.restore()
}

function drawParticle(k, p) {
    switch (k) {
        case 'snow':
            c2d.fillStyle = 'rgba(255,255,255,0.85)'
            c2d.beginPath()
            c2d.arc(p.x, p.y, p.r, 0, Math.PI * 2)
            c2d.fill()
            break
        case 'embers':
            c2d.globalAlpha = p.a * Math.min(1, p.y / (canvas.height * 0.6))
            c2d.fillStyle = `hsl(${p.hue},100%,58%)`
            c2d.beginPath()
            c2d.arc(p.x, p.y, p.r, 0, Math.PI * 2)
            c2d.fill()
            c2d.globalAlpha = 1
            break
        case 'eggs':
            c2d.save()
            c2d.translate(p.x, p.y)
            c2d.rotate(p.rot)
            c2d.fillStyle = p.c
            c2d.beginPath()
            c2d.ellipse(0, 0, p.r * 0.75, p.r, 0, 0, Math.PI * 2)
            c2d.fill()
            c2d.strokeStyle = 'rgba(255,255,255,0.8)'
            c2d.lineWidth = 2
            c2d.beginPath()
            c2d.moveTo(-p.r * 0.7, 0)
            c2d.lineTo(p.r * 0.7, 0)
            c2d.stroke()
            c2d.restore()
            break
        case 'confetti':
            c2d.save()
            c2d.translate(p.x, p.y)
            c2d.rotate(p.rot)
            c2d.fillStyle = p.c
            c2d.fillRect(-p.r / 2, -p.r, p.r, p.r * 2)
            c2d.restore()
            break
        case 'hearts': {
            const s = p.r / 30
            c2d.save()
            c2d.translate(p.x, p.y)
            c2d.scale(s, s)
            c2d.globalAlpha = p.a
            c2d.fillStyle = p.c
            c2d.beginPath()
            c2d.moveTo(0, 30)
            c2d.bezierCurveTo(-60, -10, -30, -50, 0, -20)
            c2d.bezierCurveTo(30, -50, 60, -10, 0, 30)
            c2d.fill()
            c2d.restore()
            break
        }
    }
}

function loop(now) {
    if (!rafId) return
    const dt = Math.min(3, (now - lastTime) / 16.67)
    lastTime = now
    const w = canvas.width
    const h = canvas.height

    c2d.clearRect(0, 0, w, h)

    if (kind === 'embers' && now > nextBat) {
        particles.push(spawnBat())
        nextBat = now + rand(7000, 14000)
    }

    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i]

        if (p.bat) {
            p.x += p.vx * dt
            p.flap += 0.35 * dt
            p.base += 0.03 * dt
            p.y += Math.sin(p.base) * 0.6 * dt
            if (p.x > w + 60) { particles.splice(i, 1); continue }
            drawBat(p)
            continue
        }

        p.y += p.vy * dt
        p.sw += 0.012 * dt
        p.x += Math.sin(p.sw) * (kind === 'confetti' ? 0.9 : 0.5) * dt
        if (p.rot !== undefined) p.rot += (p.vr || 0.02) * dt

        const off = p.vy > 0 ? p.y > h + 20 : p.y < -20
        if (off) particles[i] = spawn(kind, false)

        drawParticle(kind, particles[i])
    }

    rafId = requestAnimationFrame(loop)
}

function startParticles(k) {
    stopParticles()
    kind = k
    resize()
    particles = Array.from({ length: COUNTS[k] || 50 }, () => spawn(k, true))
    lastTime = performance.now()
    nextBat = lastTime + rand(3000, 6000)
    rafId = requestAnimationFrame(loop)
}

function stopParticles() {
    if (rafId) cancelAnimationFrame(rafId)
    rafId = 0
    particles = []
    if (c2d && canvas) c2d.clearRect(0, 0, canvas.width, canvas.height)
}

/* ------------------------------------------------------------------ */
/*  Application de l'événement                                         */
/* ------------------------------------------------------------------ */

function ensureDom() {
    if (bgEl) return
    bgEl = document.createElement('div')
    bgEl.id = 'event-bg'

    canvas = document.createElement('canvas')
    canvas.id = 'fx-canvas'

    bannerEl = document.createElement('div')
    bannerEl.className = 'event-banner'
    bannerEl.innerHTML = '<span class="event-dot"></span><span class="event-text"></span>'

    document.body.prepend(bgEl)
    document.body.append(canvas, bannerEl)
    c2d = canvas.getContext('2d')

    window.addEventListener('resize', resize)
    window.addEventListener('site23-prefs', applyAnimation)
    document.addEventListener('visibilitychange', applyAnimation)
}

function applyAnimation() {
    if (!current) return
    const on = animationsEnabled()
    document.body.dataset.fx = on ? 'on' : 'off'
    if (on && !document.hidden) startParticles(THEMES[current].particles)
    else stopParticles()
}

function applyEvent(key) {
    if (key && !THEMES[key]) key = null
    if (key === current) return
    current = key
    ensureDom()

    if (!key) {
        delete document.body.dataset.event
        delete document.body.dataset.fx
        bgEl.innerHTML = ''
        bgEl.style.backgroundImage = ''
        bannerEl.style.display = 'none'
        stopParticles()
        setEventSound('')
        setMusicEvent(null)
        return
    }

    document.body.dataset.event = key
    const custom = customImage(key)
    if (custom) {
        bgEl.innerHTML = ''
        bgEl.style.backgroundImage = `linear-gradient(rgba(0,0,0,0.45), rgba(0,0,0,0.45)), url("${custom}")`
    } else {
        bgEl.style.backgroundImage = ''
        bgEl.innerHTML = ART[key]() + (key === 'christmas' ? garland() : '')
    }

    bannerEl.querySelector('.event-text').textContent = THEMES[key].banner
    bannerEl.style.display = 'flex'
    setEventSound(key)
    setMusicEvent(key)
    applyAnimation()
}

async function refresh() {
    try {
        const res = await nodeFetch(`${SITE_URL}/api/karma/event`, { timeout: 8000 })
        if (res.status !== 200) return console.log(`[Événement] réponse HTTP ${res.status}`)
        const data = await res.json()
        console.log(`[Événement] données reçues ${JSON.stringify(data)}`)
        applyEvent(data.event ? data.event.key : null)
    } catch (err) {
        console.log(`[Événement] erreur : ${err && err.message ? err.message : err}`)
    }
}

export function startEvents() {
    if (started) return
    started = true
    ensureDom()
    window.site23Event = key => applyEvent(key || null)
    refresh()
    setInterval(refresh, 3 * 60 * 1000)
}