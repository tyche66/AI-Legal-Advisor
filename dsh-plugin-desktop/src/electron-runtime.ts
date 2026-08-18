/** Electron implementation of the launcher-provided desktop runtime capability. */

import {
  app,
  BrowserWindow,
  dialog,
  Menu,
  nativeImage,
  nativeTheme,
  net,
  Notification,
  shell,
  Tray,
} from 'electron'
import { spawn } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { desktopTerminalStateDirectory, openDesktopTerminal } from './desktop-terminal.ts'
import { packagedDependencyPath } from './packaged-runtime-path.ts'
import type {
  DesktopNotification,
  DesktopPlatform,
  DesktopRuntime,
  DesktopShellSpec,
  DesktopTerminalSpec,
  DesktopThemeSource,
  DesktopTrayItem,
  DesktopTrayItemGroup,
  DesktopTrayItemRegistration,
  DesktopUpdateAdapter,
} from './runtime.ts'
import type { RendererBootReport } from './renderer-boot-contract.ts'
import { prepareTrayIcon } from './tray-icons.ts'
import { downloadDesktopUpdate } from './update-download.ts'
import type { UpdateCheckResult } from './update-checker.ts'
import { desktopWindowOptions } from './window-options.ts'

/** Return the presentation mode opposite the active generation. */
export function nextDesktopShellMode(mode: DesktopShellSpec['mode']): DesktopShellSpec['mode'] {
  return mode === 'compatibility' ? 'advanced' : 'compatibility'
}

/** Return the tray command describing the mode that will be activated. */
export function modeToggleLabel(mode: DesktopShellSpec['mode']): string {
  return mode === 'compatibility'
    ? 'Switch to Advanced Mode'
    : 'Switch to Compatibility Mode'
}

/**
 * Read the desktop package version instead of Electron's development-app version.
 * @param moduleUrl - module below the package's `src` or `lib` directory.
 * @returns validated desktop product version.
 */
export function desktopProductVersion(moduleUrl: string = import.meta.url): string {
  const value: unknown = JSON.parse(readFileSync(new URL('../package.json', moduleUrl), 'utf8'))
  if (value === null || typeof value !== 'object' || typeof (value as { version?: unknown }).version !== 'string') {
    throw new Error('dsh-plugin-desktop: package.json has no product version')
  }
  return (value as { version: string }).version
}

const PRODUCT_VERSION = desktopProductVersion()

/** Native adapter used by the DSH Desktop launcher and owned by its Cordis shell plugin. */
export class ElectronDesktopRuntime implements DesktopRuntime {
  readonly platform: DesktopPlatform
  readonly updates: DesktopUpdateAdapter = {
    get isPackaged() { return app.isPackaged },
    get canDownload() { return app.isPackaged && (process.platform === 'darwin' || process.platform === 'win32') },
    get currentVersion() { return PRODUCT_VERSION },
    get statePath() { return join(app.getPath('userData'), 'updates', 'state.json') },
    request: (url, init) => net.fetch(url, init),
    confirmDownload: version => this.confirmUpdateDownload(version),
    showManualCheckResult: result => this.showManualUpdateCheckResult(result),
    downloadAndOpen: (version, signal) => this.downloadAndOpenUpdate(version, signal),
    notify: notification => { this.showNotification(notification) },
  }

  private window: BrowserWindow | undefined
  private startupWindow: BrowserWindow | undefined
  private tray: Tray | undefined
  private scheduled: DesktopShellSpec | undefined
  private mountTask: Promise<void> | undefined
  private release: (() => Promise<void>) | undefined
  private quitting = false
  private readonly trayItems = new Map<symbol, DesktopTrayItem>()
  private terminalSpec: DesktopTerminalSpec | undefined
  private rendererBootReported = false

  constructor(
    private readonly restart: () => Promise<void>,
    private readonly onRendererBoot: (report: RendererBootReport) => void = () => {},
  ) {
    if (process.platform !== 'darwin' && process.platform !== 'win32' && process.platform !== 'linux') {
      throw new Error(`dsh-plugin-desktop: unsupported Electron platform ${process.platform}`)
    }
    this.platform = process.platform
  }

  /** @inheritdoc */
  schedule(spec: DesktopShellSpec): () => Promise<void> {
    if (this.scheduled !== undefined || this.mountTask !== undefined) {
      throw new Error('dsh-plugin-desktop: a native shell generation is already registered')
    }
    const previousThemeSource = nativeTheme.themeSource
    this.scheduled = spec
    let disposed = false
    return async () => {
      if (disposed) return
      disposed = true
      try {
        await this.mountTask
      } finally {
        try {
          await this.release?.()
        } finally {
          this.release = undefined
          this.mountTask = undefined
          if (this.scheduled === spec) {
            if (spec.mode === 'advanced') nativeTheme.themeSource = previousThemeSource
            this.scheduled = undefined
          }
        }
      }
    }
  }

  /** @inheritdoc */
  mountScheduled(beforeInteractive?: () => void): Promise<void> {
    const spec = this.scheduled
    if (spec === undefined) {
      return Promise.reject(new Error('dsh-plugin-desktop: the Cordis shell plugin did not register a window'))
    }
    this.mountTask ??= this.mount(spec, beforeInteractive).then((release) => { this.release = release })
    return this.mountTask
  }

  /** Show the product-owned startup status before the Web carrier finishes booting. */
  async showStartupStatus(iconPath: string): Promise<void> {
    const icon = nativeImage.createFromPath(iconPath)
    if (icon.isEmpty()) throw new Error(`dsh-plugin-desktop: failed to load application icon ${iconPath}`)
    await this.openStartupStatus(icon)
  }

  /** Hide the product-owned startup status after boot or on failure. */
  hideStartupStatus(): void {
    this.closeStartupStatus()
  }

  /** @inheritdoc */
  show(): void {
    const spec = this.scheduled
    if (spec?.openInBrowser === true) {
      void shell.openExternal(spec.url).catch((cause: unknown) => {
        process.stderr.write(`dsh-plugin-desktop: failed to open browser: ${cause instanceof Error ? cause.message : String(cause)}\n`)
      })
      return
    }
    const window = this.window
    if (window === undefined || window.isDestroyed()) return
    if (window.isMinimized()) window.restore()
    window.show()
    window.focus()
  }

  /** @inheritdoc */
  registerTrayItem(item: DesktopTrayItem): DesktopTrayItemRegistration {
    const key = Symbol()
    this.trayItems.set(key, item)
    this.rebuildTrayMenu()
    let active = true
    return {
      refresh: () => {
        if (active) this.rebuildTrayMenu()
      },
      dispose: () => {
        if (!active) return
        active = false
        this.trayItems.delete(key)
        this.rebuildTrayMenu()
      },
    }
  }

  /**
   * Fix the profile identity before Cordis plugins can contribute terminal commands.
   * @param spec - launcher-resolved desktop profile and Harness home.
   */
  configureTerminal(spec: DesktopTerminalSpec): void {
    if (this.terminalSpec !== undefined) {
      throw new Error('dsh-plugin-desktop: terminal profile is already configured')
    }
    this.terminalSpec = { ...spec }
  }

  /** @inheritdoc */
  openTerminal(): void {
    try {
      const spec = this.terminalSpec
      if (spec === undefined) {
        throw new Error('dsh-plugin-desktop: terminal profile is not configured')
      }
      const electronVersion = process.versions.electron
      if (electronVersion === undefined) {
        throw new Error('dsh-plugin-desktop: terminal requires the Electron runtime version')
      }
      openDesktopTerminal({
        platform: this.platform,
        appExecutable: process.execPath,
        dshBootstrapPath: fileURLToPath(new URL('./desktop-cli.js', import.meta.url)),
        pnpmBinPath: packagedDependencyPath(import.meta.url, 'pnpm/bin/pnpm.mjs'),
        electronVersion,
        profileName: spec.profileName,
        productVersion: PRODUCT_VERSION,
        profileDir: spec.profileDir,
        homeDir: spec.homeDir,
        stateDir: desktopTerminalStateDirectory(app.getPath('userData'), spec.profileName),
        spawn,
        onLaunchError: cause => { this.reportTerminalLaunchError(cause) },
      })
    } catch (cause) {
      this.reportTerminalLaunchError(cause)
    }
  }

  /** @inheritdoc */
  reportRendererBoot(report: RendererBootReport): void {
    if (this.rendererBootReported) return
    this.rendererBootReported = true
    try {
      this.onRendererBoot(report)
    } catch (cause) {
      process.stderr.write(`dsh-plugin-desktop: failed to persist renderer boot health: ${cause instanceof Error ? cause.message : String(cause)}\n`)
    }
    if (report.status === 'failed') {
      void this.showRendererBootRecovery(report).catch((cause: unknown) => {
        process.stderr.write(`dsh-plugin-desktop: failed to show plugin recovery: ${cause instanceof Error ? cause.message : String(cause)}\n`)
      })
    }
  }

  /** @inheritdoc */
  setThemeSource(source: DesktopThemeSource): void {
    if (this.scheduled?.mode === 'advanced' && this.window !== undefined) {
      nativeTheme.themeSource = source
    }
  }

  /** @inheritdoc */
  async requestRestart(): Promise<void> {
    await this.restart()
  }

  /** @inheritdoc */
  prepareToQuit(): void {
    this.quitting = true
  }

  private async showRendererBootRecovery(report: Extract<RendererBootReport, { status: 'failed' }>): Promise<void> {
    const plugins = report.plugins.length === 0
      ? 'Unknown client plugin'
      : report.plugins.map(plugin => `- ${plugin}`).join('\n')
    const error = report.error === undefined ? 'The client Loader did not provide an error message.' : report.error
    const result = await dialog.showMessageBox({
      type: 'error',
      title: 'Plugin Recovery',
      message: 'AI法律顾问无法加载全部插件。',
      detail: `加载失败的插件：\n${plugins}\n\n${error}\n\n请打开 AI法律顾问终端更新或移除失败的第三方插件，然后重新启动 AI法律顾问。`,
      buttons: ['打开终端', '重新启动 AI法律顾问', '关闭'],
      defaultId: 0,
      cancelId: 2,
      noLink: true,
    })
    if (result.response === 0) this.openTerminal()
    else if (result.response === 1) await this.requestRestart()
  }

  private contributedTrayItems(group: DesktopTrayItemGroup): Electron.MenuItemConstructorOptions[] {
    return [...this.trayItems.values()]
      .filter(item => item.group === group)
      .sort((left, right) => left.order - right.order)
      .map((item): Electron.MenuItemConstructorOptions => {
        const common = {
          label: item.label(),
          enabled: item.enabled?.() ?? true,
        }
        if (item.submenu !== undefined) {
          return {
            ...common,
            submenu: item.submenu().map(command => ({
              label: command.label(),
              enabled: command.enabled?.() ?? true,
              ...(command.type === undefined ? {} : { type: command.type }),
              ...(command.checked === undefined ? {} : { checked: command.checked() }),
              click: this.trayCommand(() => command.invoke()),
            })),
          }
        }
        return {
          ...common,
          click: this.trayCommand(() => item.invoke()),
        }
      })
  }

  /** Contain asynchronous contribution failures outside Electron menu callbacks. */
  private trayCommand(invoke: () => void | Promise<void>): () => void {
    return () => {
      void Promise.resolve().then(invoke).catch((cause: unknown) => {
        process.stderr.write(`dsh-plugin-desktop: tray command failed: ${cause instanceof Error ? cause.message : String(cause)}\n`)
      })
    }
  }

  private async openStartupStatus(icon: Electron.NativeImage): Promise<void> {
    if (this.startupWindow !== undefined && !this.startupWindow.isDestroyed()) return
    const startupWindow = new BrowserWindow({
      width: 420,
      height: 240,
      resizable: false,
      minimizable: false,
      maximizable: false,
      fullscreenable: false,
      center: true,
      show: false,
      frame: false,
      alwaysOnTop: true,
      backgroundColor: '#f7fbff',
      icon,
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
      },
    })
    this.startupWindow = startupWindow
    startupWindow.once('ready-to-show', () => {
      if (!startupWindow.isDestroyed()) startupWindow.show()
    })
    const html = `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><title>AI法律顾问</title><style>*{box-sizing:border-box}html,body{width:100%;height:100%;margin:0}body{display:flex;align-items:center;justify-content:center;background:#f7fbff;color:#15345f;font:14px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif}.card{text-align:center}.spinner{width:42px;height:42px;margin:0 auto 18px;border:4px solid #d9e4f7;border-top-color:#13227a;border-radius:50%;animation:spin .9s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}h1{margin:0 0 8px;font-size:22px}p{margin:0;color:#5a6c87}</style></head><body><main class="card"><div class="spinner" aria-label="正在启动"></div><h1>AI法律顾问</h1><p>正在启动法律 AI 工作台，请稍候…</p></main></body></html>`
    await startupWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`)
  }

  private closeStartupStatus(): void {
    const startupWindow = this.startupWindow
    this.startupWindow = undefined
    if (startupWindow !== undefined && !startupWindow.isDestroyed()) startupWindow.destroy()
  }

  private async waitForWebSurface(url: string): Promise<void> {
    const deadline = Date.now() + 20_000
    let lastFailure: Error | undefined
    while (Date.now() < deadline) {
      try {
        const response = await net.fetch(url)
        if (!response.ok) {
          lastFailure = new Error(`Web 工作台返回 HTTP ${response.status}`)
        } else {
          await response.arrayBuffer()
          return
        }
      } catch (cause) {
        lastFailure = cause instanceof Error ? cause : new Error(String(cause))
      }
      await new Promise<void>(resolve => { setTimeout(resolve, 200) })
    }
    throw new Error(`Web 工作台在 20 秒内未就绪：${lastFailure?.message ?? '未知连接错误'}`)
  }

  private showNotification(notification: DesktopNotification): void {
    if (!Notification.isSupported()) return
    const nativeNotification = new Notification({
      title: notification.title,
      body: notification.body,
    })
    nativeNotification.show()
  }

  /** Ask before making the fixed download endpoint's counted request. */
  private async confirmUpdateDownload(version: string): Promise<boolean> {
    const result = await dialog.showMessageBox({
      type: 'info',
      title: 'AI法律顾问有可用更新',
      message: `AI法律顾问 ${version} 已可用。`,
      detail: '现在下载此更新吗？',
      buttons: ['下载', '稍后'],
      defaultId: 1,
      cancelId: 1,
      noLink: true,
    })
    return result.response === 0
  }

  /** Report one user-triggered check without exposing network or response details. */
  private async showManualUpdateCheckResult(result: UpdateCheckResult | null): Promise<void> {
    if (result === null) {
      await dialog.showMessageBox({
        type: 'warning',
        title: 'Unable to Check for Updates',
        message: 'AI法律顾问暂时无法检查更新。',
        detail: '请稍后重试。',
        buttons: ['确定'],
        defaultId: 0,
        noLink: true,
      })
      return
    }

    if (result.status === 'up-to-date') {
      await dialog.showMessageBox({
        type: 'info',
        title: 'AI法律顾问已是最新版本',
        message: '没有可用的新版本 AI法律顾问。',
        detail: `当前版本：${result.currentVersion}`,
        buttons: ['确定'],
        defaultId: 0,
        noLink: true,
      })
      return
    }

    await dialog.showMessageBox({
      type: 'info',
      title: 'AI法律顾问有可用更新',
      message: `AI法律顾问 ${result.latestVersion} 已可用。`,
      detail: '此版本暂不支持自动下载安装器。',
      buttons: ['确定'],
      defaultId: 0,
      noLink: true,
    })
  }

  /** Download a confirmed installer and hand it to the native installation flow. */
  private async downloadAndOpenUpdate(version: string, signal: AbortSignal): Promise<void> {
    if (this.platform !== 'darwin' && this.platform !== 'win32') {
      throw new Error(`dsh-plugin-desktop: updates are unavailable on ${this.platform}`)
    }
    const artifactPath = await downloadDesktopUpdate({
      platform: this.platform,
      version,
      userDataPath: app.getPath('userData'),
      request: (url, init) => net.fetch(url, init),
      signal,
    })
    signal.throwIfAborted()

    if (this.platform === 'darwin') {
      const openError = await shell.openPath(artifactPath)
      if (openError !== '') throw new Error(`dsh-plugin-desktop: failed to open update disk image: ${openError}`)
      signal.throwIfAborted()
      await dialog.showMessageBox({
        type: 'info',
        title: 'AI法律顾问更新已下载',
        message: `AI法律顾问 ${version} 已准备安装。`,
        detail: '磁盘映像已打开。请在 Applications 中替换 AI法律顾问，然后重新启动。',
        buttons: ['确定'],
        defaultId: 0,
        noLink: true,
      })
      return
    }

    const result = await dialog.showMessageBox({
      type: 'info',
      title: 'AI法律顾问更新已下载',
      message: `AI法律顾问 ${version} 已准备安装。`,
      detail: '现在重新启动 AI法律顾问并运行安装程序吗？',
      buttons: ['重新启动并安装', '稍后'],
      defaultId: 1,
      cancelId: 1,
      noLink: true,
    })
    if (result.response !== 0) return

    const spec = this.scheduled
    if (spec === undefined) throw new Error('dsh-plugin-desktop: no active shell can exit for update installation')
    signal.throwIfAborted()
    await this.launchWindowsUpdateInstaller(artifactPath)
    this.quitting = true
    spec.requestQuit(0)
  }

  /** Start the downloaded NSIS installer before releasing the current process. */
  private async launchWindowsUpdateInstaller(installerPath: string): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      let child: ReturnType<typeof spawn>
      try {
        child = spawn(installerPath, ['--updated', '--force-run'], {
          detached: true,
          stdio: 'ignore',
          shell: false,
          windowsHide: false,
        })
      } catch (cause) {
        reject(cause)
        return
      }
      const fail = (cause: Error): void => { reject(cause) }
      child.once('error', fail)
      child.once('spawn', () => {
        child.off('error', fail)
        child.once('error', cause => {
          process.stderr.write(`dsh-plugin-desktop: update installer failed after launch: ${cause.message}\n`)
        })
        child.unref()
        resolve()
      })
    })
  }

  /** Keep native-terminal launch failures visible in a packaged GUI process. */
  private reportTerminalLaunchError(cause: unknown): void {
    const error = cause instanceof Error ? cause : new Error(String(cause))
    process.stderr.write(`dsh-plugin-desktop: failed to open terminal: ${error.message}\n`)
    try {
      dialog.showErrorBox('Unable to Open DSH Terminal', error.message)
    } catch (dialogCause) {
      process.stderr.write(`dsh-plugin-desktop: failed to show terminal error: ${dialogCause instanceof Error ? dialogCause.message : String(dialogCause)}\n`)
    }
  }

  private rebuildTrayMenu(): void {
    const tray = this.tray
    const spec = this.scheduled
    if (tray === undefined || spec === undefined) return

    const show = (): void => { this.show() }
    const tools = this.contributedTrayItems('tools')
    const profiles = this.contributedTrayItems('profiles')
    const status = this.contributedTrayItems('status')
    const template: Electron.MenuItemConstructorOptions[] = [
      { label: `Open ${spec.productName}`, click: show },
    ]
    if (tools.length > 0) template.push({ type: 'separator' }, ...tools)
    if (profiles.length > 0) template.push({ type: 'separator' }, ...profiles)
    if (status.length > 0) template.push({ type: 'separator' }, ...status)
    template.push(
      { type: 'separator' },
      {
        label: modeToggleLabel(spec.mode),
        enabled: this.platform !== 'linux',
        click: () => {
          void spec.requestModeChange(nextDesktopShellMode(spec.mode)).catch((cause: unknown) => {
            process.stderr.write(`dsh-plugin-desktop: failed to change shell mode: ${cause instanceof Error ? cause.message : String(cause)}\n`)
          })
        },
      },
      { type: 'separator' },
      { label: 'Quit', click: () => { spec.requestQuit(0) } },
    )
    tray.setContextMenu(Menu.buildFromTemplate(template))
  }

  private async mount(
    spec: DesktopShellSpec,
    beforeInteractive: (() => void) | undefined,
  ): Promise<() => Promise<void>> {
    const icon = nativeImage.createFromPath(spec.iconPath)
    if (icon.isEmpty()) {
      throw new Error(`dsh-plugin-desktop: failed to load application icon ${spec.iconPath}`)
    }
    if (this.platform === 'darwin') app.dock?.setIcon(icon)
    if (spec.mode === 'advanced') nativeTheme.themeSource = spec.readThemeSource()

    if (spec.openInBrowser === true) {
      let tray: Tray | undefined
      // Electron quits automatically on Windows/Linux when no listener handles this event.
      const keepAliveWithoutWindows = (): void => {}
      const openBrowser = (): void => {
        void shell.openExternal(spec.url).then(() => {
          this.closeStartupStatus()
        }).catch((cause: unknown) => {
          this.closeStartupStatus()
          const message = `无法打开系统浏览器：${cause instanceof Error ? cause.message : String(cause)}`
          process.stderr.write(`dsh-plugin-desktop: ${message}\n`)
          try { dialog.showErrorBox('AI法律顾问无法打开浏览器', message) } catch { /* best effort */ }
        })
      }
      try {
        await this.openStartupStatus(icon)
        await this.waitForWebSurface(spec.url)
        app.on('window-all-closed', keepAliveWithoutWindows)
        tray = new Tray(prepareTrayIcon(spec.trayIcons, this.platform))
        this.tray = tray
        tray.setToolTip(spec.productName)
        this.rebuildTrayMenu()
        app.on('activate', openBrowser)
        tray.on('click', openBrowser)
        beforeInteractive?.()
        openBrowser()
      } catch (cause) {
        app.off('activate', openBrowser)
        app.off('window-all-closed', keepAliveWithoutWindows)
        tray?.off('click', openBrowser)
        tray?.destroy()
        this.tray = undefined
        this.closeStartupStatus()
        throw cause
      }

      if (tray === undefined) {
        this.closeStartupStatus()
        throw new Error('dsh-plugin-desktop: native tray did not mount')
      }
      const mountedTray = tray
      let released = false
      return async () => {
        if (released) return
        released = true
        app.off('activate', openBrowser)
        app.off('window-all-closed', keepAliveWithoutWindows)
        mountedTray.off('click', openBrowser)
        mountedTray.destroy()
        if (this.tray === mountedTray) this.tray = undefined
        this.closeStartupStatus()
      }
    }

    const origin = new URL(spec.url).origin
    const window = new BrowserWindow(desktopWindowOptions(spec, icon, this.platform))
    window.accessibleTitle = spec.windowTitle
    if (this.platform === 'win32') window.removeMenu()
    this.window = window

    const show = (): void => { this.show() }
    const close = (event: Electron.Event): void => {
      if (this.quitting) return
      event.preventDefault()
      window.hide()
    }
    const preserveBlankTitle = (event: Electron.Event): void => { event.preventDefault() }
    const navigate = (event: Electron.Event<{ url: string }>): void => {
      let targetOrigin: string | undefined
      try {
        targetOrigin = new URL(event.url).origin
      } catch {
        targetOrigin = undefined
      }
      if (targetOrigin !== origin) event.preventDefault()
    }

    app.on('activate', show)
    window.on('close', close)
    window.on('page-title-updated', preserveBlankTitle)
    window.webContents.on('will-frame-navigate', navigate)
    window.webContents.on('will-redirect', navigate)
    const unresponsive = (): void => {
      process.stderr.write('dsh-plugin-desktop: desktop renderer became unresponsive\n')
    }
    const responsive = (): void => {
      process.stderr.write('dsh-plugin-desktop: desktop renderer became responsive\n')
    }
    const renderProcessGone = (_event: Electron.Event, details: Electron.RenderProcessGoneDetails): void => {
      process.stderr.write(`dsh-plugin-desktop: desktop renderer exited: ${details.reason}\n`)
    }
    const failedLoad = (_event: Electron.Event, errorCode: number, errorDescription: string, validatedURL: string, isMainFrame: boolean): void => {
      if (isMainFrame) process.stderr.write(`dsh-plugin-desktop: failed to load ${validatedURL}: ${errorCode} ${errorDescription}\n`)
    }
    window.webContents.on('unresponsive', unresponsive)
    window.webContents.on('responsive', responsive)
    window.webContents.on('render-process-gone', renderProcessGone)
    window.webContents.on('did-fail-load', failedLoad)
    window.webContents.setWindowOpenHandler(({ url }) => {
      try {
        const target = new URL(url)
        if (target.protocol === 'https:' || target.protocol === 'http:' || target.protocol === 'mailto:') {
          void shell.openExternal(target.href).catch((cause: unknown) => {
            process.stderr.write(`dsh-plugin-desktop: failed to open external link: ${cause instanceof Error ? cause.message : String(cause)}\n`)
          })
        }
      } catch {
        // A malformed target is rejected with the same deny result.
      }
      return { action: 'deny' }
    })

    window.once('ready-to-show', show)
    let tray: Tray | undefined
    try {
      await window.loadURL(spec.url)
      tray = new Tray(prepareTrayIcon(spec.trayIcons, this.platform))
      this.tray = tray
      tray.setToolTip(spec.productName)
      this.rebuildTrayMenu()
      tray.on('click', show)
      beforeInteractive?.()
      this.closeStartupStatus()
    } catch (cause) {
      app.off('activate', show)
      window.off('page-title-updated', preserveBlankTitle)
      tray?.off('click', show)
      tray?.destroy()
      window.destroy()
      this.tray = undefined
      this.window = undefined
      throw cause
    }

    if (tray === undefined) {
      throw new Error('dsh-plugin-desktop: native tray did not mount')
    }
    const mountedTray = tray

    let released = false
    return async () => {
      if (released) return
      released = true
      app.off('activate', show)
      window.off('close', close)
      window.off('page-title-updated', preserveBlankTitle)
      window.webContents.off('will-frame-navigate', navigate)
      window.webContents.off('will-redirect', navigate)
      window.webContents.off('unresponsive', unresponsive)
      window.webContents.off('responsive', responsive)
      window.webContents.off('render-process-gone', renderProcessGone)
      window.webContents.off('did-fail-load', failedLoad)
      mountedTray.off('click', show)
      mountedTray.destroy()
      if (!window.isDestroyed()) window.destroy()
      if (this.tray === mountedTray) this.tray = undefined
      if (this.window === window) this.window = undefined
    }
  }
}
