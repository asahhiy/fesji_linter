import { existsSync, mkdirSync, unlinkSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const certDir = resolve(rootDir, '.certs')
const certPath = resolve(certDir, 'localhost-cert.pem')
const keyPath = resolve(certDir, 'localhost-key.pem')
const rootCertPath = resolve(certDir, 'fesji-local-root-ca.pem')
const rootKeyPath = resolve(certDir, 'fesji-local-root-ca-key.pem')
const csrPath = resolve(certDir, 'localhost.csr')
const extPath = resolve(certDir, 'localhost.ext')
const hosts = ['localhost', '127.0.0.1']

if (existsSync(certPath) && existsSync(keyPath) && existsSync(rootCertPath)) {
  console.log(`Development certificate already exists at ${certPath}`)
  process.exit(0)
}

mkdirSync(certDir, { recursive: true })

if (hasCommand('mkcert')) {
  run('mkcert', ['-cert-file', certPath, '-key-file', keyPath, ...hosts])
  console.log(`Created trusted localhost certificate with mkcert in ${certDir}`)
  process.exit(0)
}

if (!hasCommand('openssl')) {
  throw new Error('OpenSSL or mkcert is required to create a localhost HTTPS certificate.')
}

run('openssl', [
  'req',
  '-x509',
  '-new',
  '-nodes',
  '-newkey',
  'rsa:2048',
  '-sha256',
  '-days',
  '825',
  '-keyout',
  rootKeyPath,
  '-out',
  rootCertPath,
  '-subj',
  '/CN=FESJI Local Development Root CA',
  '-addext',
  'basicConstraints=critical,CA:TRUE,pathlen:0',
  '-addext',
  'keyUsage=critical,keyCertSign,cRLSign',
  '-addext',
  'subjectKeyIdentifier=hash',
])

run('openssl', [
  'req',
  '-new',
  '-newkey',
  'rsa:2048',
  '-nodes',
  '-sha256',
  '-keyout',
  keyPath,
  '-out',
  csrPath,
  '-subj',
  '/CN=localhost',
])

writeFileSync(
  extPath,
  [
    'basicConstraints=critical,CA:FALSE',
    'keyUsage=critical,digitalSignature,keyEncipherment',
    'extendedKeyUsage=serverAuth',
    'subjectAltName=DNS:localhost,IP:127.0.0.1',
    'subjectKeyIdentifier=hash',
    'authorityKeyIdentifier=keyid,issuer',
    '',
  ].join('\n'),
)

run('openssl', [
  'x509',
  '-req',
  '-in',
  csrPath,
  '-CA',
  rootCertPath,
  '-CAkey',
  rootKeyPath,
  '-CAcreateserial',
  '-out',
  certPath,
  '-days',
  '825',
  '-sha256',
  '-extfile',
  extPath,
])

removeIfExists(csrPath)
removeIfExists(extPath)

console.log(`Created localhost certificate in ${certDir}`)
console.log('If Word refuses to load the task pane, trust .certs/fesji-local-root-ca.pem in macOS Keychain.')

function hasCommand(command) {
  return spawnSync(command, ['--version'], { stdio: 'ignore' }).status === 0
}

function run(command, args) {
  const result = spawnSync(command, args, { stdio: 'inherit' })

  if (result.error) {
    throw result.error
  }

  if (result.status !== 0) {
    throw new Error(`${command} exited with status ${result.status}`)
  }
}

function removeIfExists(path) {
  if (existsSync(path)) {
    unlinkSync(path)
  }
}
