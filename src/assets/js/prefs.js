/**
 * Préférences locales du launcher (animations, sons, volume).
 * Stockées dans le localStorage de l'application.
 */

const KEY = 'site23.prefs'

function read() {
    try {
        return JSON.parse(localStorage.getItem(KEY) || '{}')
    } catch (e) {
        return {}
    }
}

export function getPref(name, fallback) {
    const prefs = read()
    return name in prefs ? prefs[name] : fallback
}

export function setPref(name, value) {
    const prefs = read()
    prefs[name] = value
    try {
        localStorage.setItem(KEY, JSON.stringify(prefs))
    } catch (e) { /* stockage indisponible : on ignore */ }
    window.dispatchEvent(new CustomEvent('site23-prefs', { detail: { name, value } }))
}

/**
 * Animations : "auto" suit le réglage Windows « Afficher les animations »
 * (prefers-reduced-motion), "on" les force, "off" les coupe.
 */
export function animationsEnabled() {
    const mode = getPref('animations', 'auto')
    if (mode === 'on') return true
    if (mode === 'off') return false
    return !window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function soundsEnabled() {
    return getPref('sounds', true) !== false
}

export function volume() {
    const v = Number(getPref('volume', 0.5))
    return Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 0.5
}

export function musicEnabled() {
    return getPref('music', true) !== false
}

export function musicVolume() {
    const v = Number(getPref('musicVolume', 0.3))
    return Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 0.3
}