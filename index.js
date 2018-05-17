// server requirements

const express = require('express')
const path = require('path')
const fs = require('fs')
const http = require('http')
const https = require('https')
const {spawn} = require('child_process')

const main = ( httpsApp, httpAppBehaviour) => {

  if(!(process.env.CERT_DOMAINNAMES && process.env.CERT_EMAIL))
    throw('Can not generate or watch SSL certificates without access to CERT_DOMAINNAMES and CERT_EMAIL')

  const domain = process.env.CERT_DOMAINNAMES.split(',')[0]
  let certificate, certPath = `/etc/letsencrypt/live/${domain}`

  const server = {
    http: null,
    https: null
  }

  httpAppBehaviour = httpAppBehaviour || [
    {
      method: 'get',
      path: '*',
      cb: (req, res) => res.redirect(`https://${req.headers.host}${req.url}`)
    }
  ]

  const httpApp = express()

  //endpoint for letsencrypt / certbot challenges
  httpApp.get('/.well-known/acme-challenge/:fileName', (req, res) => {
    const filePath = path.join('/usr/src/server', '.well-known/acme-challenge/', req.params.fileName)
    if (fs.existsSync(filePath)) {
      res.sendFile(filePath)
    } else {
      console.warn('Certbot requested file does not exist. server.https will not reboot')
      res.status(400).json({
        'message': 'Letsencrypt webroot challenge received, but the file was not found on this location.'
      }) // Bad request
    }
  })

  httpAppBehaviour.map(({method, path, cb, args}) => {
    args ? httpApp[method](...args) : httpApp[method](path, cb)
  })

  server.http = http.createServer(httpApp)
  server.http.listen(80, () => {
    console.log(`server (http) is listening on port 80 for webroot challenge and ${httpAppBehaviour.length} other action(s)`)
    getNewCertificates()
  })

  /// functions
  {
    let watching = false

    function getNewCertificates () {
      const initServer = spawn('.', ['/letsencrypt_webroot.sh'], {cwd: '/', shell: true})
      console.log('running letsencrypt_webroot.sh')

      initServer.stdout.on('data', (data) => {
        console.log(data.toString())
      })

      initServer.stderr.on('data', (data) => {
        console.log(data.toString())
      })

      initServer.on('close', (code) => {
        console.log(`letsencrypt_webroot.sh exited with code ${code}.`)
        if ( !certificate ) certificate = readCertificate()
        if ( !server.https && certificate ) createHttpsServer()
        if ( !watching ) watchCertificateFiles()
      })
    }

    function readCertificate () {
      try {
        return {
          key: fs.readFileSync(`${certPath}/privkey.pem`, 'utf8'),
          cert: fs.readFileSync(`${certPath}/cert.pem`, 'utf8')
        }
      } catch ( e ) {
        console.warn('Could not find certificate in ' + certPath)
      }
    }

    function createHttpsServer () {
      server.https = https.createServer(certificate, httpsApp)
      server.https.listen(443, function () {
        console.log(`https server running on port ${443}.`)
      })
    }

    function watchCertificateFiles () { // watch certificate file for change (renewal) and update server when it does
      try {
        fs.watch(`${certPath}/privkey.pem`, () => {
          const newKey = fs.readFileSync(`${certPath}/privkey.pem`, 'utf8'),
            newCert = fs.readFileSync(`${certPath}/cert.pem`, 'utf8')
          certificate = {
            key: newKey,
            cert: newCert
          }
          server.https._sharedCreds.context.setCert(newCert)
          server.https._sharedCreds.context.setKey(newKey)
        })
        watching = true
      } catch ( e ) {
        // Certificate files do not exist yet
      }
    }
  }

  certificate = readCertificate ()
  if ( certificate ) {
    createHttpsServer()
    watchCertificateFiles()
  }

  return server
}

module.exports = main
