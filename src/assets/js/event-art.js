/**
 * Décors des événements (SVG), dans l'esprit d'une installation SCP :
 * béton, vitrines de confinement, écrans de contrôle, tampons de dossier.
 * Chaque décor rappelle son thème sans être enfantin.
 */

const MONO = "Consolas, 'Courier New', monospace"

const svg = inner => `<svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMax slice" xmlns="http://www.w3.org/2000/svg">${inner}</svg>`

const text = (x, y, t, { color = '#d8d8d0', size = 15, op = 0.55, anchor = 'start', spacing = 2 } = {}) =>
    `<text x="${x}" y="${y}" fill="${color}" fill-opacity="${op}" font-family="${MONO}" font-size="${size}" letter-spacing="${spacing}" text-anchor="${anchor}">${t}</text>`

// Tampon encadré, comme sur un dossier de la Fondation
const tag = (x, y, w, t, color, op = 0.6) =>
    `<rect x="${x}" y="${y - 21}" width="${w}" height="30" fill="none" stroke="${color}" stroke-opacity="${op}" stroke-width="2"/>${text(x + 12, y, t, { color, op, size: 14 })}`

const hazard = (id, y, h, op) =>
    `<defs><pattern id="${id}" width="48" height="48" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="24" height="48" fill="#e8b923"/><rect x="24" width="24" height="48" fill="#0b0b0b"/></pattern></defs><rect y="${y}" width="1600" height="${h}" fill="url(#${id})" fill-opacity="${op}"/>`

const grid = (id, color, op, size = 80) =>
    `<defs><pattern id="${id}" width="${size}" height="${size}" patternUnits="userSpaceOnUse"><path d="M${size} 0H0V${size}" fill="none" stroke="${color}" stroke-opacity="${op}"/></pattern></defs><rect width="1600" height="900" fill="url(#${id})"/>`

const pine = (x, ground, h) =>
    Array.from({ length: 5 }, (_, i) => {
        const ty = ground - h + i * (h / 6.5)
        const by = ty + h / 3
        const hw = (i + 1) * h * 0.05
        return `<polygon points="${x},${ty} ${x + hw},${by} ${x - hw},${by}"/>`
    }).join('') + `<rect x="${x - 4}" y="${ground - h * 0.08}" width="8" height="${h * 0.08}"/>`

const crystal = (x, y, r) =>
    `<g transform="translate(${x} ${y})" stroke="#cfe3ff" stroke-opacity=".28" stroke-width="2" fill="none" stroke-linecap="round">` +
    [0, 60, 120].map(a => `<g transform="rotate(${a})"><line x1="${-r}" y1="0" x2="${r}" y2="0"/><path d="M${r * 0.55} 0 l${r * 0.2} ${-r * 0.2} M${r * 0.55} 0 l${r * 0.2} ${r * 0.2} M${-r * 0.55} 0 l${-r * 0.2} ${-r * 0.2} M${-r * 0.55} 0 l${-r * 0.2} ${r * 0.2}"/></g>`).join('') +
    '</g>'

const egg = (x, y, s, c1, c2) =>
    `<g transform="translate(${x} ${y}) scale(${s})"><ellipse rx="34" ry="46" fill="${c1}" fill-opacity=".9"/><path d="M-32 -6 L-16 -18 L0 -6 L16 -18 L32 -6" stroke="${c2}" stroke-opacity=".8" stroke-width="5" fill="none"/><path d="M-30 18 L-15 8 L0 18 L15 8 L30 18" stroke="${c2}" stroke-opacity=".8" stroke-width="5" fill="none"/></g>`

export const ART = {
    // Site-23 sous la neige, vu de nuit depuis le périmètre
    christmas: () => {
        const windows = []
        for (let j = 0; j < 3; j++) {
            for (let i = 0; i < 6; i++) {
                if ((i * 7 + j * 3) % 5 < 2) windows.push(`<rect x="${1010 + i * 52}" y="${642 + j * 48}" width="26" height="20" fill="#ffcf7a" fill-opacity=".75"/>`)
            }
        }
        const posts = Array.from({ length: 28 }, (_, i) => `<line x1="${i * 60}" y1="770" x2="${i * 60}" y2="810"/>`).join('')
        const pines = [[50, 840, 260], [190, 855, 190], [1470, 840, 280], [1570, 855, 200], [1340, 870, 150], [650, 880, 120]]
            .map(([x, y, h]) => pine(x, y, h)).join('')
        const cone = x => `<polygon points="${x - 6},600 ${x + 6},600 ${x + 150},800 ${x - 150},800" fill="url(#xm-cone)"/>`
        return svg(`
            <defs>
                <linearGradient id="xm-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#08142b" stop-opacity=".78"/><stop offset=".75" stop-color="#0b1a33" stop-opacity=".12"/><stop offset="1" stop-color="#0b1a33" stop-opacity="0"/></linearGradient>
                <linearGradient id="xm-cone" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e6f1ff" stop-opacity=".20"/><stop offset="1" stop-color="#e6f1ff" stop-opacity="0"/></linearGradient>
                <linearGradient id="xm-snow" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9fb4cc" stop-opacity=".6"/><stop offset="1" stop-color="#0b1626" stop-opacity=".92"/></linearGradient>
            </defs>
            <rect width="1600" height="900" fill="url(#xm-sky)"/>
            <polygon points="0,790 180,660 340,745 520,630 720,765 900,700 1100,775 1300,650 1480,735 1600,690 1600,900 0,900" fill="#0b1626" fill-opacity=".9"/>
            ${cone(970)}${cone(1390)}
            <g fill="#070d17">
                <rect x="980" y="610" width="360" height="190"/>
                <rect x="930" y="705" width="60" height="95"/>
                <rect x="1340" y="665" width="110" height="135"/>
                <rect x="1156" y="520" width="5" height="95"/>
                <rect x="966" y="598" width="8" height="205"/><rect x="1386" y="598" width="8" height="205"/>
            </g>
            <circle class="blink" cx="1158" cy="515" r="5" fill="#ff3b3b"/>
            <circle cx="970" cy="598" r="6" fill="#e6f1ff"/><circle cx="1390" cy="598" r="6" fill="#e6f1ff"/>
            ${windows.join('')}
            <rect x="1214" y="730" width="34" height="70" fill="#ffcf7a" fill-opacity=".55"/>
            <g stroke="#0a1220" stroke-width="3" stroke-opacity=".9">${posts}<line x1="0" y1="772" x2="1600" y2="772"/><line x1="0" y1="808" x2="1600" y2="808"/></g>
            <line x1="0" y1="764" x2="1600" y2="764" stroke="#0a1220" stroke-width="2" stroke-dasharray="10 8" stroke-opacity=".9"/>
            <g fill="#06101a">${pines}</g>
            <path d="M0 835 Q 300 790 640 830 T 1280 820 T 1600 828 V900 H0Z" fill="url(#xm-snow)"/>
            ${crystal(90, 110, 34)}${crystal(1510, 170, 26)}${crystal(260, 70, 18)}
            ${tag(40, 872, 520, 'SITE-23 // PÉRIMÈTRE EXTÉRIEUR // HIVER', '#cfe3ff', 0.45)}
            ${text(1560, 876, 'ACCÈS : NIVEAU 2', { anchor: 'end', color: '#cfe3ff', op: 0.4 })}`)
    },

    // Alerte de brèche : couloir de confinement, éclairage de secours, silhouette au fond
    halloween: () => {
        const lights = [0, 0.35, 0.6, 0.78, 0.9].map((t, i) => {
            const w = 170 * (1 - t) + 18
            const h = 16 * (1 - t) + 3
            const y = 360 * t + 10 * (1 - t)
            return `<g class="flicker" style="animation-delay:${i * 0.7}s"><rect x="${800 - w * 2.2}" y="${y - h}" width="${w * 4.4}" height="${h * 4}" fill="#ff7a2a" fill-opacity=".05"/><rect x="${800 - w / 2}" y="${y}" width="${w}" height="${h}" fill="#ffb347" fill-opacity=".9"/></g>`
        }).join('')
        return svg(`
            <defs>
                <linearGradient id="hw-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#16062b" stop-opacity=".78"/><stop offset="1" stop-color="#16062b" stop-opacity=".25"/></linearGradient>
                <radialGradient id="hw-alarm"><stop offset="0" stop-color="#ff2a2a" stop-opacity=".6"/><stop offset="1" stop-color="#ff2a2a" stop-opacity="0"/></radialGradient>
                <radialGradient id="hw-door"><stop offset="0" stop-color="#ff4a2a" stop-opacity=".65"/><stop offset="1" stop-color="#ff4a2a" stop-opacity="0"/></radialGradient>
            </defs>
            <rect width="1600" height="900" fill="url(#hw-sky)"/>
            <polygon points="0,0 1600,0 900,360 700,360" fill="#07030d" fill-opacity=".7"/>
            <polygon points="0,900 1600,900 900,500 700,500" fill="#08040f" fill-opacity=".75"/>
            <polygon points="0,0 700,360 700,500 0,900" fill="#0c0714" fill-opacity=".55"/>
            <polygon points="1600,0 900,360 900,500 1600,900" fill="#0c0714" fill-opacity=".55"/>
            <g stroke="#3a2a55" stroke-opacity=".6" stroke-width="2"><line x1="0" y1="0" x2="700" y2="360"/><line x1="1600" y1="0" x2="900" y2="360"/><line x1="0" y1="900" x2="700" y2="500"/><line x1="1600" y1="900" x2="900" y2="500"/></g>
            <circle cx="800" cy="440" r="170" fill="url(#hw-door)"/>
            <rect x="772" y="392" width="56" height="108" fill="#ff4a2a" fill-opacity=".35"/>
            <g fill="#06020a" stroke="#06020a">
                <circle cx="800" cy="414" r="6" stroke="none"/>
                <rect x="796" y="420" width="8" height="52" stroke="none"/>
                <rect x="796" y="470" width="3" height="30" stroke="none"/><rect x="801" y="470" width="3" height="30" stroke="none"/>
                <line x1="796" y1="424" x2="788" y2="482" stroke-width="2.5"/><line x1="804" y1="424" x2="812" y2="482" stroke-width="2.5"/>
            </g>
            ${lights}
            <circle class="alarm" cx="0" cy="0" r="460" fill="url(#hw-alarm)"/>
            <circle class="alarm b" cx="1600" cy="0" r="460" fill="url(#hw-alarm)"/>
            <g class="fog"><ellipse cx="500" cy="820" rx="460" ry="42" fill="#cdbfe6" fill-opacity=".05"/><ellipse cx="1150" cy="850" rx="520" ry="48" fill="#cdbfe6" fill-opacity=".04"/></g>
            ${hazard('hw-hz', 872, 28, 0.55)}
            ${tag(40, 60, 470, 'ALERTE // BRÈCHE DE CONFINEMENT', '#ff5a4a', 0.7)}
            ${text(1560, 60, 'SECTEUR 7 // ACCÈS RESTREINT', { anchor: 'end', color: '#ffb0a0', op: 0.45 })}`)
    },

    // Spécimens ovoïdes en vitrine de confinement
    easter: () => {
        const cases = [[240, 'OVO-01', '#9b88b8', '#d8cde8'], [550, 'OVO-02', '#8fb8a5', '#d3e8dc'], [860, 'OVO-03', '#d0c58f', '#f0e8c0'], [1170, 'OVO-04', '#8fa8c8', '#d0dcee']]
            .map(([x, id, c1, c2]) => `
                <polygon points="${x + 80},510 ${x + 140},510 ${x + 215},745 ${x + 5},745" fill="url(#ea-cone)"/>
                <rect x="${x + 70}" y="498" width="80" height="12" fill="#bfe3da" fill-opacity=".5"/>
                <rect x="${x}" y="520" width="220" height="230" fill="#9fd0c8" fill-opacity=".06" stroke="#9fd0c8" stroke-opacity=".5" stroke-width="2"/>
                <line x1="${x + 24}" y1="540" x2="${x + 84}" y2="735" stroke="#ffffff" stroke-opacity=".09" stroke-width="10"/>
                ${egg(x + 110, 655, 1.25, c1, c2)}
                <rect x="${x - 10}" y="750" width="240" height="16" fill="#0b1c1c" stroke="#9fd0c8" stroke-opacity=".4"/>
                ${text(x + 110, 790, 'SPÉC. ' + id, { size: 14, anchor: 'middle', color: '#bfe3da', op: 0.6 })}`).join('')
        const stem = (x, flip) => `<path d="M${x} 900 C ${x + 14 * flip} 780 ${x - 30 * flip} 690 ${x + 20 * flip} 580" stroke="#8fcf9f" stroke-opacity=".28" stroke-width="3" fill="none"/>` +
            [0.3, 0.55, 0.8].map(t => `<ellipse cx="${x + 18 * flip * t}" cy="${900 - 320 * t}" rx="26" ry="9" transform="rotate(${-35 * flip} ${x + 18 * flip * t} ${900 - 320 * t})" fill="#8fcf9f" fill-opacity=".2"/>`).join('')
        return svg(`
            <defs>
                <linearGradient id="ea-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0f2a2a" stop-opacity=".62"/><stop offset="1" stop-color="#0f2a2a" stop-opacity=".1"/></linearGradient>
                <linearGradient id="ea-cone" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e8fff8" stop-opacity=".16"/><stop offset="1" stop-color="#e8fff8" stop-opacity="0"/></linearGradient>
            </defs>
            <rect width="1600" height="900" fill="url(#ea-sky)"/>
            ${grid('ea-grid', '#9fd0c8', 0.07)}
            <rect y="768" width="1600" height="132" fill="#061212" fill-opacity=".6"/>
            ${stem(60, 1)}${stem(150, 1)}${stem(1540, -1)}${stem(1450, -1)}
            ${cases}
            ${tag(40, 872, 540, 'ÉCHANTILLONS OVOÏDES // CLASSE : SAFE', '#bfe3da', 0.5)}
            ${text(1560, 876, 'PRINTEMPS // SECTEUR B', { anchor: 'end', color: '#bfe3da', op: 0.4 })}`)
    },

    // Salle de contrôle : compte à rebours, horloge, écrans
    newyear: () => {
        const ticks = Array.from({ length: 60 }, (_, i) => {
            const a = (i * 6 * Math.PI) / 180
            const major = i % 5 === 0
            const r1 = major ? 196 : 208
            return `<line x1="${(Math.sin(a) * r1).toFixed(1)}" y1="${(-Math.cos(a) * r1).toFixed(1)}" x2="${(Math.sin(a) * 222).toFixed(1)}" y2="${(-Math.cos(a) * 222).toFixed(1)}" stroke="#e8c44a" stroke-opacity="${major ? 0.7 : 0.35}" stroke-width="${major ? 4 : 2}"/>`
        }).join('')
        const burst = (cx, cy, r) => Array.from({ length: 16 }, (_, i) => {
            const a = (i / 16) * Math.PI * 2
            return `<line x1="${(cx + Math.cos(a) * r * 0.4).toFixed(1)}" y1="${(cy + Math.sin(a) * r * 0.4).toFixed(1)}" x2="${(cx + Math.cos(a) * r).toFixed(1)}" y2="${(cy + Math.sin(a) * r).toFixed(1)}" stroke="#ffd45c" stroke-width="2" stroke-linecap="round" stroke-opacity=".35"/>`
        }).join('')
        const monitors = [[100, 150, '00:00:00', 'T-MINUS', 44], [400, 150, 'REBOOT', 'CYCLE N+1', 32], [100, 330, 'OK', 'SYSTÈMES', 40], [400, 330, 'SITE-23', 'EN LIGNE', 30]]
            .map(([x, y, big, small, size]) => `
                <rect x="${x}" y="${y}" width="260" height="150" fill="#06102a" fill-opacity=".75" stroke="#e8c44a" stroke-opacity=".45" stroke-width="2"/>
                ${text(x + 130, y + 88, big, { anchor: 'middle', color: '#ffd45c', op: 0.85, size, spacing: 4 })}
                ${text(x + 14, y + 26, small, { color: '#e8c44a', op: 0.5, size: 13 })}`).join('')
        return svg(`
            <defs><linearGradient id="ny-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0a1330" stop-opacity=".7"/><stop offset="1" stop-color="#0a1330" stop-opacity=".15"/></linearGradient></defs>
            <rect width="1600" height="900" fill="url(#ny-sky)"/>
            ${grid('ny-grid', '#e8c44a', 0.05, 100)}
            ${burst(820, 150, 120)}${burst(1050, 560, 90)}
            <g transform="translate(1230 330)">
                <circle r="235" fill="#06102a" fill-opacity=".35" stroke="#e8c44a" stroke-opacity=".4" stroke-width="3"/>
                <circle r="185" fill="none" stroke="#e8c44a" stroke-opacity=".2" stroke-width="2"/>
                ${ticks}
                <line x1="0" y1="0" x2="0" y2="-150" stroke="#ffd45c" stroke-opacity=".85" stroke-width="6" stroke-linecap="round"/>
                <line x1="0" y1="0" x2="0" y2="-190" stroke="#ffd45c" stroke-opacity=".6" stroke-width="3" stroke-linecap="round"/>
                <circle r="9" fill="#ffd45c" fill-opacity=".9"/>
            </g>
            ${monitors}
            <path d="M0 900 V840 H140 V800 H260 V850 H420 V810 H600 V860 H900 V820 H1100 V850 H1400 V805 H1600 V900Z" fill="#04081a" fill-opacity=".85"/>
            ${tag(40, 872, 580, 'REDÉMARRAGE DU CYCLE // T-00:00:00', '#ffd45c', 0.55)}
            ${text(1560, 876, 'NIVEAU D’ACCÈS : 4', { anchor: 'end', color: '#ffd45c', op: 0.4 })}`)
    },

    // Moniteur de signes vitaux : électrocardiogramme, anomalie affective
    valentine: () => {
        const beat = cx => `L${cx - 60} 640 L${cx - 40} 625 L${cx - 25} 640 L${cx - 10} 640 L${cx} 520 L${cx + 16} 720 L${cx + 30} 640 L${cx + 70} 640 L${cx + 95} 610 L${cx + 120} 640`
        const ecg = 'M0 640 ' + [200, 560, 920, 1280].map(beat).join(' ') + ' L1600 640'
        return svg(`
            <defs><linearGradient id="va-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a0510" stop-opacity=".72"/><stop offset="1" stop-color="#2a0510" stop-opacity=".2"/></linearGradient></defs>
            <rect width="1600" height="900" fill="url(#va-sky)"/>
            ${grid('va-grid', '#ff7aa2', 0.07, 60)}
            <path transform="translate(640 330) scale(7)" d="M0 30 C -60 -10 -30 -50 0 -20 C 30 -50 60 -10 0 30Z" fill="none" stroke="#ff7aa2" stroke-opacity=".24" stroke-width=".5" stroke-dasharray="3 3"/>
            <path d="${ecg}" fill="none" stroke="#e0506f" stroke-opacity=".18" stroke-width="14" stroke-linejoin="round"/>
            <path d="${ecg}" fill="none" stroke="#ff7a99" stroke-opacity=".9" stroke-width="3" stroke-linejoin="round"/>
            <g class="sweep"><rect x="0" y="470" width="3" height="330" fill="#ff8fab" fill-opacity=".5"/></g>
            ${text(40, 60, 'FRÉQUENCE CARDIAQUE : 72 BPM', { color: '#ffb3c6', op: 0.55, size: 17 })}
            ${text(40, 88, 'RYTHME : SINUSAL', { color: '#ffb3c6', op: 0.4, size: 14 })}
            ${text(1560, 60, 'NIVEAU D’ATTACHEMENT : ÉLEVÉ', { anchor: 'end', color: '#ffb3c6', op: 0.45 })}
            <path d="M0 880 Q 500 855 1000 876 T 1600 868 V900 H0Z" fill="#14030a" fill-opacity=".85"/>
            ${tag(40, 872, 590, 'ANOMALIE AFFECTIVE // SUJET STABLE', '#ff7a99', 0.55)}`)
    }
}

// Guirlande sobre (Noël) : câble noir et petites LED qui clignotent doucement
export function garland() {
    const colors = ['#ff5a4d', '#ffe3a3', '#69d68a', '#ffe3a3']
    let bulbs = ''
    let i = 0
    for (let k = 0; k < 8; k++) {
        for (const t of [0.25, 0.5, 0.75]) {
            const x = k * 200 + 200 * t
            const y = (1 - t) * (1 - t) * 8 + 2 * (1 - t) * t * 50 + t * t * 8
            bulbs += `<circle class="bulb" cx="${x}" cy="${y + 4}" r="3.5" fill="${colors[i % 4]}" style="animation-delay:${(i % 6) * 0.35}s"/>`
            i++
        }
    }
    const wire = 'M0 8 ' + Array.from({ length: 8 }, (_, k) => `Q ${k * 200 + 100} 50 ${k * 200 + 200} 8`).join(' ')
    return `<svg class="garland" viewBox="0 0 1600 60" preserveAspectRatio="xMidYMin slice" xmlns="http://www.w3.org/2000/svg"><path d="${wire}" fill="none" stroke="#0e0e0e" stroke-opacity=".85" stroke-width="2"/>${bulbs}</svg>`
}