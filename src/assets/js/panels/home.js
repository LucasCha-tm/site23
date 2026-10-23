/**
 * @author Luuxis
 * Luuxis License v1.0 (voir fichier LICENSE pour les détails en FR/EN)
 */
import { config, database, logger, changePanel, appdata, setStatus, pkg, popup } from '../utils.js'
import { startEvents } from '../fx.js'
import { initSfx } from '../sfx.js'
import { setGameRunning } from '../audio.js'

const { Launch } = require('minecraft-java-core')
const { shell, ipcRenderer } = require('electron')
const nodeFetch = require('node-fetch')

const STATUS_PAGE_URL = 'https://site23.betteruptime.com/'

class Home {
    static id = "home";
    async init(config) {
        this.config = config;
        this.db = new database();
        this.news()
        this.socialLick()
        this.instancesSelect()
        initSfx()
        startEvents()
        this.welcome()
        this.karma()
        this.sanctions()
        this.session()
        document.querySelector('.settings-btn').addEventListener('click', e => changePanel('settings'))
        document.querySelector('.home .rail-status')?.addEventListener('click', () => shell.openExternal(STATUS_PAGE_URL))
    }

    /** Affiche le pseudo du joueur connecté dans l'en-tête. */
    async welcome() {
        try {
            const el = document.querySelector('.hero-name')
            if (!el) return
            let configClient = await this.db.readData('configClient')
            let auth = await this.db.readData('accounts', configClient.account_selected)
            if (auth?.name) el.textContent = auth.name
        } catch (err) {
            console.log(`[Accueil] ${err && err.message ? err.message : err}`)
        }
    }

    /**
     * Tablette carcérale : affiche la classe et les points du joueur connecté.
     * Lit l'API du plugin Azuriom : {site}/api/karma/{pseudo}
     */
    async karma() {
        console.log('[Tablette] démarrage')
        const box = document.querySelector('.karma-info')
        if (!box) return console.log('[Tablette] bloc .karma-info introuvable : home.html pas à jour')

        const levels = {
            normal: 'Neutre',
            red: 'Rouge',
            black: 'Noire',
            yellow: 'Jaune',
            white: 'Blanche'
        }

        // Adresse du site Azuriom où le plugin « Tablette carcérale » est installé
        const KARMA_SITE_URL = 'https://site23.alwaysdata.net'

        const refresh = async () => {
            try {
                let configClient = await this.db.readData('configClient')
                let auth = await this.db.readData('accounts', configClient.account_selected)
                if (!auth?.name) {
                    console.log('[Tablette] aucun compte connecté')
                    return (box.style.display = 'none')
                }

                const base = KARMA_SITE_URL.replace(/\/+$/, '')
                const apiUrl = `${base}/api/karma/${encodeURIComponent(auth.name)}`
                console.log(`[Tablette] appel de ${apiUrl}`)

                const res = await nodeFetch(apiUrl, { timeout: 8000 })
                if (res.status !== 200) {
                    console.log(`[Tablette] réponse HTTP ${res.status} (config.online = ${this.config.online})`)
                    return (box.style.display = 'none')
                }
                const data = await res.json()
                console.log(`[Tablette] données reçues ${JSON.stringify(data)}`)

                const badge = box.querySelector('.karma-badge')
                badge.textContent = levels[data.level] ?? data.level
                badge.style.background = data.color
                badge.style.color = ['white', 'yellow'].includes(data.level) ? '#0b0b0b' : '#ffffff'
                box.querySelector('.karma-points').textContent = `${data.points} ${Math.abs(data.points) === 1 ? 'pt' : 'pts'}`

                // Couleur de la classe sur l'icône et le bord (la classe noire est éclaircie pour rester lisible)
                const accent = data.level === 'black' ? '#8f8c84' : data.color
                box.style.borderLeftColor = accent
                box.querySelector('.karma-icon').style.color = accent

                // Jauge à 5 zones : blanche | jaune | neutre | rouge | noire (avec une marge aux extrémités)
                const t = data.thresholds || { red: 200, black: 400, yellow: -200, white: -400 }
                const min = t.white - 100
                const max = t.black + 100
                const pct = v => Math.min(100, Math.max(0, ((v - min) / (max - min)) * 100))
                const w = pct(t.white), y = pct(t.yellow), r = pct(t.red), k = pct(t.black)
                const gauge = box.querySelector('.karma-gauge')
                gauge.style.background = `linear-gradient(to right, #f8f9fa 0 ${w}%, #ffc107 ${w}% ${y}%, #4a4a46 ${y}% ${r}%, #dc3545 ${r}% ${k}%, #000000 ${k}% 100%)`
                box.querySelector('.karma-cursor').style.left = `${pct(data.points)}%`
                box.style.display = 'flex'
            } catch (err) {
                console.log(`[Tablette] erreur : ${err && err.message ? err.message : err}`)
                box.style.display = 'none'
            }
        }

        await refresh()
        clearInterval(this.karmaTimer)
        this.karmaTimer = setInterval(refresh, 60 * 1000)
    }

    /**
     * Sanctions LiteBans : ban / mute (temporaire ou définitif) ou "aucune sanction".
     * Lit l'API : {site}/api/karma/{pseudo}/sanctions
     */
    async sanctions() {
        console.log('[Sanctions] démarrage')
        const box = document.querySelector('.sanction-info')
        if (!box) return console.log('[Sanctions] bloc .sanction-info introuvable : home.html pas à jour')
        const list = box.querySelector('.sanction-list')
        const KARMA_SITE_URL = 'https://site23.alwaysdata.net'
        let state = null
        let offset = 0 // décalage entre l'horloge du serveur et celle du PC

        const duration = ms => {
            const s = Math.max(0, Math.floor(ms / 1000))
            const d = Math.floor(s / 86400)
            const h = Math.floor((s % 86400) / 3600)
            const m = Math.floor((s % 3600) / 60)
            if (d > 0) return `${d} j ${h} h ${m} min`
            if (h > 0) return `${h} h ${m} min`
            if (m > 0) return `${m} min ${String(s % 60).padStart(2, '0')} s`
            return `${s} s`
        }

        const addRow = (color, kind, text, tooltip) => {
            const row = document.createElement('div')
            row.className = 'sanction-row'
            if (tooltip) row.title = tooltip
            const dot = document.createElement('span')
            dot.className = 'sanction-dot'
            dot.style.background = color
            const k = document.createElement('span')
            k.className = 'sanction-kind'
            k.textContent = kind
            const t = document.createElement('span')
            t.className = 'sanction-text'
            t.textContent = text
            row.append(dot, k, t)
            list.appendChild(row)
        }

        const render = () => {
            if (!state || !state.available) return (box.style.display = 'none')
            const now = Date.now() + offset
            list.innerHTML = ''
            let any = false

            for (const [key, label, color] of [['ban', 'Banni', '#dc3545'], ['mute', 'Mute', '#f0a020']]) {
                const s = state[key]
                if (!s) continue
                if (s.permanent) {
                    addRow(color, label, 'Définitif', s.reason)
                    any = true
                } else if (s.until - now > 0) {
                    addRow(color, label, `Reste ${duration(s.until - now)}`, s.reason)
                    any = true
                }
            }

            if (!any) addRow('#5dbb63', 'Aucune sanction', '', '')
            box.style.display = 'block'
        }

        const refresh = async () => {
            try {
                let configClient = await this.db.readData('configClient')
                let auth = await this.db.readData('accounts', configClient.account_selected)
                if (!auth?.name) return (box.style.display = 'none')

                const apiUrl = `${KARMA_SITE_URL}/api/karma/${encodeURIComponent(auth.name)}/sanctions`
                console.log(`[Sanctions] appel de ${apiUrl}`)
                const res = await nodeFetch(apiUrl, { timeout: 8000 })
                if (res.status !== 200) {
                    console.log(`[Sanctions] réponse HTTP ${res.status}`)
                    state = null
                    return render()
                }
                state = await res.json()
                console.log(`[Sanctions] données reçues ${JSON.stringify(state)}`)
                if (!state.available) console.log('[Sanctions] indisponible : LiteBans non configuré ou erreur de base côté site')
                if (state.now) offset = state.now - Date.now()
                render()
            } catch (err) {
                console.log(`[Sanctions] erreur : ${err && err.message ? err.message : err}`)
                state = null
                render()
            }
        }

        await refresh()
        clearInterval(this.sanctionRefreshTimer)
        clearInterval(this.sanctionTickTimer)
        this.sanctionRefreshTimer = setInterval(refresh, 60 * 1000)
        this.sanctionTickTimer = setInterval(render, 1000)
    }

    /**
     * Session (Bientôt / En cours / Terminée), réglée dans Azuriom (Admin > Tablette carcérale > Sessions).
     * Lit l'API : {site}/api/karma/session
     */
    async session() {
        const box = document.querySelector('.session-info')
        if (!box) return
        const KARMA_SITE_URL = 'https://site23.alwaysdata.net'
        const nameEl = box.querySelector('.session-name')
        const badgeEl = box.querySelector('.session-badge')
        const countEl = box.querySelector('.session-countdown')
        const labels = { soon: 'Bientôt', ongoing: 'En cours', finished: 'Terminée' }
        let session = null
        let offset = 0 // décalage entre l'horloge du serveur et celle du PC

        const duration = ms => {
            const s = Math.max(0, Math.floor(ms / 1000))
            const d = Math.floor(s / 86400)
            const h = Math.floor((s % 86400) / 3600)
            const m = Math.floor((s % 3600) / 60)
            if (d > 0) return `${d} j ${h} h ${m} min`
            if (h > 0) return `${h} h ${m} min`
            return `${m} min ${String(s % 60).padStart(2, '0')} s`
        }

        const shortDate = ts => new Date(ts).toLocaleString('fr-FR', {
            weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
        })

        const render = () => {
            if (!session) {
                nameEl.textContent = 'À définir'
                badgeEl.style.display = 'none'
                countEl.textContent = ''
                return
            }

            const now = Date.now() + offset
            nameEl.textContent = session.name
            badgeEl.textContent = labels[session.status] ?? session.status
            badgeEl.className = `session-badge ${session.status}`
            badgeEl.style.display = ''

            if (session.status === 'soon') {
                if (!session.timestamp) countEl.textContent = 'Date à venir'
                else if (session.timestamp > now) countEl.textContent = `${shortDate(session.timestamp)} · Dans ${duration(session.timestamp - now)}`
                else countEl.textContent = `Prévue le ${shortDate(session.timestamp)}`
            } else if (session.status === 'ongoing') {
                countEl.textContent = session.timestamp ? `Commencée le ${shortDate(session.timestamp)}` : 'Session en cours'
            } else {
                countEl.textContent = session.timestamp ? `Le ${shortDate(session.timestamp)}` : ''
            }
        }

        const refresh = async () => {
            try {
                const res = await nodeFetch(`${KARMA_SITE_URL}/api/karma/session`, { timeout: 8000 })
                if (res.status !== 200) return console.log(`[Session] réponse HTTP ${res.status}`)
                const data = await res.json()
                console.log(`[Session] données reçues ${JSON.stringify(data)}`)
                session = data.session || null
                if (data.now) offset = data.now - Date.now()
                render()
            } catch (err) {
                console.log(`[Session] erreur : ${err && err.message ? err.message : err}`)
            }
        }

        await refresh()
        clearInterval(this.sessionRefreshTimer)
        clearInterval(this.sessionTickTimer)
        this.sessionRefreshTimer = setInterval(refresh, 2 * 60 * 1000)
        this.sessionTickTimer = setInterval(render, 1000)
    }

    async news() {
        let newsElement = document.querySelector('.news-list');
        let news = await config.getNews(this.config).then(res => res).catch(err => false);
        if (news) {
            if (!news.length) {
                let blockNews = document.createElement('div');
                const date = this.getdate(new Date())
                blockNews.classList.add('news-block');
                blockNews.innerHTML = `
                    <div class="news-header">
                        <img class="server-status-icon" src="assets/images/icon/icon.png">
                        <div class="header-text">
                            <div class="title">Aucun news n'ai actuellement disponible.</div>
                        </div>
                        <div class="date">
                            <div class="day">${date.day}</div>
                            <div class="month">${date.month}</div>
                        </div>
                    </div>
                    <div class="news-content">
                        <div class="bbWrapper">
                            <p>Vous pourrez suivre ici toutes les news relative au serveur.</p>
                        </div>
                    </div>`
                newsElement.appendChild(blockNews);
            } else {
                for (let News of news) {
                    let date = this.getdate(News.publish_date)
                    let blockNews = document.createElement('div');
                    blockNews.classList.add('news-block');
                    blockNews.innerHTML = `
                        <div class="news-header">
                            <img class="server-status-icon" src="assets/images/icon/icon.png">
                            <div class="header-text">
                                <div class="title">${News.title}</div>
                            </div>
                            <div class="date">
                                <div class="day">${date.day}</div>
                                <div class="month">${date.month}</div>
                            </div>
                        </div>
                        <div class="news-content">
                            <div class="bbWrapper">
                                <p>${News.content.replace(/\n/g, '</br>')}</p>
                                <p class="news-author">Auteur - <span>${News.author}</span></p>
                            </div>
                        </div>`
                    newsElement.appendChild(blockNews);
                }
            }
        } else {
            let blockNews = document.createElement('div');
            const date = this.getdate(new Date())
            blockNews.classList.add('news-block');
            blockNews.innerHTML = `
                <div class="news-header">
                        <img class="server-status-icon" src="assets/images/icon/icon.png">
                        <div class="header-text">
                            <div class="title">Error.</div>
                        </div>
                        <div class="date">
                            <div class="day">${date.day}</div>
                            <div class="month">${date.month}</div>
                        </div>
                    </div>
                    <div class="news-content">
                        <div class="bbWrapper">
                            <p>Impossible de contacter le serveur des news.</br>Merci de vérifier votre configuration.</p>
                        </div>
                    </div>`
            newsElement.appendChild(blockNews);
        }
    }

    socialLick() {
        document.querySelectorAll('.social-block').forEach(e => {
            e.addEventListener('click', () => {
                const url = e.dataset.url;
                if ('https:' !== new URL(url).protocol) return;
                shell.openExternal(url)
            })
        })
    }

    async instancesSelect() {
        let configClient = await this.db.readData('configClient')
        let auth = await this.db.readData('accounts', configClient.account_selected)
        let instancesList = await config.getInstanceList()
        let instanceSelect = instancesList.find(i => i.name == configClient?.instance_select) ? configClient?.instance_select : null

        let instanceBTN = document.querySelector('.play-instance')
        let instancePopup = document.querySelector('.instance-popup')
        let instancesListPopup = document.querySelector('.instances-List')
        let instanceCloseBTN = document.querySelector('.close-popup')

        if (instancesList.length === 1) {
            document.querySelector('.instance-select').style.display = 'none'
            instanceBTN.style.paddingRight = '0'
        }

        if (!instanceSelect) {
            let newInstanceSelect = instancesList.find(i => i.whitelistActive == false)
            let configClient = await this.db.readData('configClient')
            configClient.instance_select = newInstanceSelect.name
            instanceSelect = newInstanceSelect.name
            await this.db.updateData('configClient', configClient)
        }

        for (let instance of instancesList) {
            if (instance.whitelistActive) {
                let whitelist = instance.whitelist.find(whitelist => whitelist == auth?.name)
                if (whitelist !== auth?.name) {
                    if (instance.name == instanceSelect) {
                        let newInstanceSelect = instancesList.find(i => i.whitelistActive == false)
                        let configClient = await this.db.readData('configClient')
                        configClient.instance_select = newInstanceSelect.name
                        instanceSelect = newInstanceSelect.name
                        setStatus(newInstanceSelect.status)
                        await this.db.updateData('configClient', configClient)
                    }
                }
            } else console.log(`Initializing instance ${instance.name}...`)
            if (instance.name == instanceSelect) setStatus(instance.status)
        }

        instancePopup.addEventListener('click', async e => {
            let configClient = await this.db.readData('configClient')

            if (e.target.classList.contains('instance-elements')) {
                let newInstanceSelect = e.target.id
                let activeInstanceSelect = document.querySelector('.active-instance')

                if (activeInstanceSelect) activeInstanceSelect.classList.toggle('active-instance');
                e.target.classList.add('active-instance');

                configClient.instance_select = newInstanceSelect
                await this.db.updateData('configClient', configClient)
                instanceSelect = instancesList.filter(i => i.name == newInstanceSelect)
                instancePopup.style.display = 'none'
                let instance = await config.getInstanceList()
                let options = instance.find(i => i.name == configClient.instance_select)
                await setStatus(options.status)
            }
        })

        instanceBTN.addEventListener('click', async e => {
            let configClient = await this.db.readData('configClient')
            let instanceSelect = configClient.instance_select
            let auth = await this.db.readData('accounts', configClient.account_selected)

            if (e.target.classList.contains('instance-select')) {
                instancesListPopup.innerHTML = ''
                for (let instance of instancesList) {
                    if (instance.whitelistActive) {
                        instance.whitelist.map(whitelist => {
                            if (whitelist == auth?.name) {
                                if (instance.name == instanceSelect) {
                                    instancesListPopup.innerHTML += `<div id="${instance.name}" class="instance-elements active-instance">${instance.name}</div>`
                                } else {
                                    instancesListPopup.innerHTML += `<div id="${instance.name}" class="instance-elements">${instance.name}</div>`
                                }
                            }
                        })
                    } else {
                        if (instance.name == instanceSelect) {
                            instancesListPopup.innerHTML += `<div id="${instance.name}" class="instance-elements active-instance">${instance.name}</div>`
                        } else {
                            instancesListPopup.innerHTML += `<div id="${instance.name}" class="instance-elements">${instance.name}</div>`
                        }
                    }
                }

                instancePopup.style.display = 'flex'
            }

            if (!e.target.classList.contains('instance-select')) this.startGame()
        })

        instanceCloseBTN.addEventListener('click', () => instancePopup.style.display = 'none')
    }

    async startGame() {
        let launch = new Launch()
        let configClient = await this.db.readData('configClient')
        let instance = await config.getInstanceList()
        let authenticator = await this.db.readData('accounts', configClient.account_selected)
        let options = instance.find(i => i.name == configClient.instance_select)

        let playInstanceBTN = document.querySelector('.play-instance')
        let infoStartingBOX = document.querySelector('.info-starting-game')
        let infoStarting = document.querySelector(".info-starting-game-text")
        let progressBar = document.querySelector('.progress-bar')

        let opt = {
            url: options.url,
            authenticator: authenticator,
            timeout: 10000,
            path: `${await appdata()}/${process.platform == 'darwin' ? this.config.dataDirectory : `.${this.config.dataDirectory}`}`,
            instance: options.name,
            version: options.loader.minecraft_version,
            detached: configClient.launcher_config.closeLauncher == "close-all" ? false : true,
            downloadFileMultiple: configClient.launcher_config.download_multi,
            intelEnabledMac: configClient.launcher_config.intelEnabledMac,

            loader: {
                type: options.loader.loader_type,
                build: options.loader.loader_version,
                enable: options.loader.loader_type == 'none' ? false : true
            },

            verify: options.verify,

            ignored: [...options.ignored],

            java: {
                path: configClient.java_config.java_path,
            },

            JVM_ARGS:  options.jvm_args ? options.jvm_args : [],
            GAME_ARGS: options.game_args ? options.game_args : [],

            screen: {
                width: configClient.game_config.screen_size.width,
                height: configClient.game_config.screen_size.height
            },

            memory: {
                min: `${configClient.java_config.java_memory.min * 1024}M`,
                max: `${configClient.java_config.java_memory.max * 1024}M`
            }
        }

        launch.Launch(opt);

        playInstanceBTN.style.display = "none"
        infoStartingBOX.style.display = "block"
        progressBar.style.display = "";
        ipcRenderer.send('main-window-progress-load')

        launch.on('extract', extract => {
            ipcRenderer.send('main-window-progress-load')
            console.log(extract);
        });

        launch.on('progress', (progress, size) => {
            infoStarting.innerHTML = `Téléchargement ${((progress / size) * 100).toFixed(0)}%`
            ipcRenderer.send('main-window-progress', { progress, size })
            progressBar.value = progress;
            progressBar.max = size;
        });

        launch.on('check', (progress, size) => {
            infoStarting.innerHTML = `Vérification ${((progress / size) * 100).toFixed(0)}%`
            ipcRenderer.send('main-window-progress', { progress, size })
            progressBar.value = progress;
            progressBar.max = size;
        });

        launch.on('estimated', (time) => {
            let hours = Math.floor(time / 3600);
            let minutes = Math.floor((time - hours * 3600) / 60);
            let seconds = Math.floor(time - hours * 3600 - minutes * 60);
            console.log(`${hours}h ${minutes}m ${seconds}s`);
        })

        launch.on('speed', (speed) => {
            console.log(`${(speed / 1067008).toFixed(2)} Mb/s`)
        })

        launch.on('patch', patch => {
            console.log(patch);
            ipcRenderer.send('main-window-progress-load')
            infoStarting.innerHTML = `Patch en cours...`
        });

        launch.on('data', (e) => {
            setGameRunning(true)
            progressBar.style.display = "none"
            if (configClient.launcher_config.closeLauncher == 'close-launcher') {
                ipcRenderer.send("main-window-hide")
            };
            new logger('Minecraft', '#36b030');
            ipcRenderer.send('main-window-progress-load')
            infoStarting.innerHTML = `Demarrage en cours...`
            console.log(e);
        })

        launch.on('close', code => {
            setGameRunning(false)
            if (configClient.launcher_config.closeLauncher == 'close-launcher') {
                ipcRenderer.send("main-window-show")
            };
            ipcRenderer.send('main-window-progress-reset')
            infoStartingBOX.style.display = "none"
            playInstanceBTN.style.display = "flex"
            infoStarting.innerHTML = `Vérification`
            new logger(pkg.name, '#7289da');
            console.log('Close');
        });

        launch.on('error', err => {
            setGameRunning(false)
            let popupError = new popup()

            popupError.openPopup({
                title: 'Erreur',
                content: err.error,
                color: 'red',
                options: true
            })

            if (configClient.launcher_config.closeLauncher == 'close-launcher') {
                ipcRenderer.send("main-window-show")
            };
            ipcRenderer.send('main-window-progress-reset')
            infoStartingBOX.style.display = "none"
            playInstanceBTN.style.display = "flex"
            infoStarting.innerHTML = `Vérification`
            new logger(pkg.name, '#7289da');
            console.log(err);
        });
    }

    getdate(e) {
        let date = new Date(e)
        let year = date.getFullYear()
        let month = date.getMonth() + 1
        let day = date.getDate()
        let allMonth = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']
        return { year: year, month: allMonth[month - 1], day: day }
    }
}
export default Home;