import { after, type CancelablePromise } from "./timing"

/** How long after an open socket closes it tries again, ms. */
const AFTER_OPEN_MS = 1000

/** The longest it waits between tries, ms. */
const MOST_WAIT_MS = 10_000

/****************
 * ### `ReconnectingSocket`
 * A websocket that comes back:  it opens, and when it closes it tries again, until `close()`.
 *
 * ```ts
 * new ReconnectingSocket("/api/server/live", { onMessage: (text) => heard(JSON.parse(text)) })
 * ```
 *
 * - A relative address is read against this page's, and `http` becomes `ws`.
 * - Closed after it had opened:  it tries again after `firstWait` ms.
 * - A try that failed:  it waits twice as long each time, up to 10s.
 * - `send()` with no socket open answers false, and sends nothing:  what to do about it is the caller's.
 * - No `WebSocket` in this browser or program:  it does nothing, quietly.
 * - NOT `spell/server`'s `liveClient`, which is served to pages as one function's text, so it can import nothing.
 * - Imports only `timing`, and goes in no barrel:  a page takes it by file (`spell/util/ReconnectingSocket`).
 ****************/
export class ReconnectingSocket {
  /** The socket now, once one is opening. */
  private socket: WebSocket | undefined
  /** The next try. */
  private retry: CancelablePromise<void> | undefined
  /** It was told to stop:  no more tries. */
  private isStopped = false
  /** How long the next failed try waits, ms. */
  private wait: number

  constructor(
    private readonly address: string | URL,
    private readonly props: ReconnectingSocketProps = {}
  ) {
    this.wait = props.firstWait ?? AFTER_OPEN_MS
    this.open()
  }

  /** Is a socket open now? */
  get isOpen(): boolean {
    return this.socket?.readyState === 1
  }

  /** Send `text`, if a socket is open.  Answers whether it went:  never throws. */
  send(text: string): boolean {
    if (!this.isOpen) return false
    this.socket!.send(text)
    return true
  }

  /** Stop:  the socket closes, and no more tries. */
  close(): void {
    this.isStopped = true
    this.retry?.cancel()
    this.retry = undefined
    this.socket?.close()
  }

  /** Open a socket, and hear it. */
  private open(): void {
    if (this.isStopped || typeof WebSocket === "undefined") return
    const socket = new WebSocket(socketAddressOf(this.address))
    this.socket = socket
    let hasOpened = false
    socket.addEventListener("open", () => {
      hasOpened = true
      this.wait = this.props.firstWait ?? AFTER_OPEN_MS
      this.props.onOpen?.()
    })
    socket.addEventListener("message", (message: MessageEvent<string>) => this.props.onMessage?.(message.data))
    socket.addEventListener("close", () => {
      if (this.socket === socket) this.socket = undefined
      if (hasOpened) this.props.onClose?.()
      if (this.isStopped) return
      const wait = this.wait
      this.wait = Math.min(wait * 2, MOST_WAIT_MS)
      this.retry = after(wait / 1000, () => this.open())
    })
  }
}

/** Constructor props of a `ReconnectingSocket`. */
export type ReconnectingSocketProps = {
  /** Hear a text message. */
  onMessage?: (text: string) => void
  /** A socket opened:  the first time, and each time it comes back. */
  onOpen?: () => void
  /** A socket that had opened closed. */
  onClose?: () => void
  /** How long the first try after a close waits, ms;  default 1s. */
  firstWait?: number
}

/** `address` as a socket's:  read against this page's, with its scheme turned from `http` to `ws`. */
function socketAddressOf(address: string | URL): URL {
  const url = new URL(address, typeof location === "undefined" ? undefined : location.href)
  url.protocol = url.protocol.replace(/^http/, "ws")
  return url
}
