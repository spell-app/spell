import { spawnSync } from "node:child_process"
import { mkdtempSync, readFileSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { connect } from "node:tls"
import { afterAll, describe, expect, it } from "vite-plus/test"

import { SRV } from "spell/server"

/** a certificate for `names` by openssl, `{ cert, key }` as text;  none without openssl */
function certificateFor(folder: string, file: string, names: string): SRV.CertificateFiles | undefined {
  const [cert, key] = [join(folder, `${file}.pem`), join(folder, `${file}-key.pem`)]
  const made = spawnSync(
    "openssl",
    ["req", "-x509", "-newkey", "ec", "-pkeyopt", "ec_paramgen_curve:prime256v1", "-nodes", "-days", "2"].concat([
      "-subj",
      "/CN=localhost",
      "-addext",
      `subjectAltName=${names}`,
      "-keyout",
      key,
      "-out",
      cert
    ]),
    { stdio: "ignore" }
  )
  if (made.error || made.status !== 0) return undefined
  return { cert: readFileSync(cert, "utf8"), key: readFileSync(key, "utf8") }
}

describe("WebServer.useCertificate():  a certificate made again is taken in place (epic `editor` P49)", () => {
  const folder = mkdtempSync(join(tmpdir(), "use-certificate-"))
  const first = certificateFor(folder, "first", "DNS:localhost")
  const again = certificateFor(folder, "again", "DNS:localhost,DNS:seo.localhost")

  afterAll(() => rmSync(folder, { recursive: true, force: true }))

  /** the names in the certificate a TLS connection to `port` is shown */
  const namesShown = (port: number) =>
    new Promise<string>((done, fail) => {
      const socket = connect({ port, host: "127.0.0.1", servername: "localhost", rejectUnauthorized: false }, () => {
        done(socket.getPeerCertificate().subjectaltname ?? "")
        socket.destroy()
      })
      socket.on("error", fail)
    })

  it.skipIf(!first || !again)("new connections get the new names;  no HTTPS:  false", async () => {
    const web = new SRV.WebServer({ certificate: first })
    await web.listen({ port: 0 })
    expect(await namesShown(web.port)).toBe("DNS:localhost")
    expect(web.useCertificate(again!)).toBe(true)
    expect(await namesShown(web.port)).toBe("DNS:localhost, DNS:seo.localhost")
    await web.close()
    expect(new SRV.WebServer().useCertificate(again!)).toBe(false)
  })
})
