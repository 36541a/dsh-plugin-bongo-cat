/**
 * `steam` widget — installed Steam games as one-click launchers.
 *
 * The host enumerates `appmanifest_*.acf` across every Steam library, so this
 * card works without the Bongo Cat art pipeline and without touching the game
 * installation. Launching hands the appid back to the host, which runs
 * `steam://rungameid/<id>` (loopback-only, numeric validation) — a browser
 * cannot open a protocol handler from a background tab reliably, and the host
 * is the only side allowed to start a process.
 */
import type { SteamWidgetConfig } from '../../shared/widgets'
import type { RpcResult } from '../settings'
import type { WidgetContext, WidgetDefinition, WidgetHandle } from './registry'

interface SteamGame {
  appid: number
  name: string
  playtimeMinutes: number
  lastPlayed: number
}

interface SteamLibrary {
  games: SteamGame[]
  /** `none` when no Steam library could be read at all. */
  source: 'steam' | 'none'
}

const formatPlaytime = (minutes: number): string => {
  if (minutes < 60) return `${minutes} min`
  return `${(minutes / 60).toFixed(1)} h`
}

export const steamWidget: WidgetDefinition = {
  type: 'steam',
  labelKey: 'widgetSteam',
  descriptionKey: 'widgetSteamDesc',
  mount(host: HTMLElement, ctx: WidgetContext): WidgetHandle {
    const root = document.createElement('div')
    root.className = 'bc-widget-steam'
    const list = document.createElement('div')
    list.className = 'bc-widget-steam-list'
    list.dataset.role = 'steam-list'
    const status = document.createElement('div')
    status.className = 'bc-widget-steam-status'
    const header = document.createElement('div')
    header.className = 'bc-widget-steam-bar'
    const refresh = document.createElement('button')
    refresh.type = 'button'
    refresh.className = 'bc-widget-button bc-widget-button-ghost bc-widget-refresh'
    refresh.dataset.role = 'steam-refresh'
    refresh.textContent = ctx.t('widgetSteamRefresh')
    header.append(refresh)
    root.append(header, list, status)
    host.append(root)

    let config = ctx.instance.config as SteamWidgetConfig
    let games: SteamGame[] = []
    let loading = false
    let disposed = false

    const setStatus = (key: Parameters<typeof ctx.t>[0] | null): void => {
      status.textContent = key === null ? '' : ctx.t(key)
      status.hidden = key === null
    }

    const launch = async (game: SteamGame): Promise<void> => {
      if (!ctx.isLoopback) {
        setStatus('widgetSteamLocalOnly')
        return
      }
      const result = await ctx.rpc.call('/bongo-cat', 'steam/launch', { appid: game.appid }) as RpcResult<{ launched: boolean }>
      if (!result.ok) setStatus('widgetSteamLaunchFailed')
    }

    const render = (): void => {
      list.replaceChildren()
      const shown = games.slice(0, config.limit)
      for (const game of shown) {
        const row = document.createElement('button')
        row.type = 'button'
        row.className = 'bc-widget-steam-row'
        row.dataset.role = 'steam-game'
        row.dataset.appid = String(game.appid)
        row.title = game.name
        const name = document.createElement('span')
        name.className = 'bc-widget-steam-name'
        name.textContent = game.name
        row.append(name)
        if (config.showPlaytime) {
          const playtime = document.createElement('span')
          playtime.className = 'bc-widget-steam-time'
          playtime.textContent = formatPlaytime(game.playtimeMinutes)
          row.append(playtime)
        }
        row.disabled = !ctx.isLoopback
        row.addEventListener('click', () => { void launch(game) })
        list.append(row)
      }
      list.hidden = shown.length === 0
      if (shown.length === 0 && !loading) setStatus('widgetSteamEmpty')
      else if (shown.length > 0) setStatus(ctx.isLoopback ? null : 'widgetSteamLocalOnly')
    }

    const load = async (): Promise<void> => {
      if (loading) return
      loading = true
      refresh.disabled = true
      setStatus('widgetSteamLoading')
      const result = await ctx.rpc.call('/bongo-cat', 'steam/library', {}) as RpcResult<SteamLibrary>
      loading = false
      refresh.disabled = false
      if (disposed) return
      if (!result.ok) {
        games = []
        list.replaceChildren()
        list.hidden = true
        setStatus('widgetSteamFailed')
        return
      }
      games = [...result.value.games].sort((a, b) => b.lastPlayed - a.lastPlayed)
      render()
      if (games.length === 0) setStatus('widgetSteamEmpty')
    }

    refresh.addEventListener('click', () => { void load() })
    void load()

    return {
      update(instance) {
        config = instance.config as SteamWidgetConfig
        render()
      },
      destroy() {
        disposed = true
        refresh.remove()
        root.remove()
      }
    }
  }
}
