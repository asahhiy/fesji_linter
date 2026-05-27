import { existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const certPath = resolve(rootDir, '.certs/localhost-cert.pem')
const rootCertPath = resolve(rootDir, '.certs/fesji-local-root-ca.pem')
const loginKeychainPath = resolve(homedir(), 'Library/Keychains/login.keychain-db')
const trustedCertPath = existsSync(rootCertPath) ? rootCertPath : certPath

if (!existsSync(trustedCertPath)) {
  throw new Error('Run npm run cert:dev before trusting the development certificate.')
}

const result = spawnSync(
  'security',
  ['add-trusted-cert', '-d', '-r', 'trustRoot', '-k', loginKeychainPath, trustedCertPath],
  {
    stdio: 'inherit',
  },
)

if (result.error) {
  throw result.error
}

if (result.status !== 0) {
  throw new Error(`security exited with status ${result.status}`)
}

console.log(`Trusted development certificate at ${trustedCertPath}`)
