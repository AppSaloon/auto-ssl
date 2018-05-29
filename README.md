# auto-ssl
## *For dockerized ExpressJS servers*

### Table of contents
1. [Introduction](#introduction)
2. [Setup](#setup)
    1. [Installation](#installation)
    2. [Usage](#usage)
        1. [Basic usage](#usage-basic)
        2. [Advanced usage](#usage-advanced)
3. [Deployment](#deployment)
    1. [Environment variables](#environment)
    2. [Volumes](#volumes)

### Introduction<a name="introduction"></a>
This package provides an easy way to automatically request and renew your ExpressJS server's SSL sertificate.
After the setup and deployment of your server, you will be able to run a https website or api.
This package will install `Certbot` by (free) certificate authority `letsencrypt` on your docker image and will request and renew SSL certificates for your domain through its `webroot` method.
(webroot means that your server will generate a temporary file, which is requested by the `letsencrypt` service to ensure that you control the server linked to a domain name)

**Note:** this package is optimized for docker services or stacks.

### Setup<a name="setup"></a>
#### Installation<a name="installation"></a>
`npm i @appsaloon/auto-ssl`

After the package is installed on, it will trigger a post-install script which adds the following files to your project directory:
* `Dockerfile` or `Dockerfile.new` if one already existed
* `letsencrypt_webroot.sh`

**IMPORTANT:** After these two files are generated, complete the `Dockerfile` for your server's needs. (Only edit the part within the designated space.)
Already have a `Dockerfile`? Paste the relevant bits of your old Dockerfile inside the designated space in `Dockerfile.new` and rename it to `Dockerfile`.

Modifying any of the content outside the designated space within `Dockerfile` or `Dockerfile.new` is not recommended. The last line of the Dockerfile, `CMD [ "node", "index.js" ]`, is an exception. Either rename your server to index.js or change the CMD arguments in the generated Dockerfile. A simple example index.js can be found in the [Basic usage](#usage-basic) section.
The generated Dockerfile already sets the WORKDIR. Installing your server in another WORKDIR than will break the webroot capability.

#### Usage<a name="usage"></a>
##### Basic usage<a name="usage-basic"></a>
1. include the express and auto-ssl packages
    ``` javascript
    const express = require('express')
    const autoSsl = require('@appsaloon/auto-ssl')
    ```
2. Define your app and its routing
    ```javascript
    const app = express()
    app.get('/', (req, res) => {
     res.send('hello world')
    })
    // ... add the routes you need
    ```
3. Start the https server!
    ```javascript
    autoSsl(app)
    ```
    alternatively:
    ```javascript
    const server = autoSsl(app) //in case you want to have control over the generated http and https servers this object contains.
    ```
    **Note:** this function will return a `server` object, containing two properties:
    * `http`: a minimal http server, already listening on port 80. All this does is accept and reply to letsencrypt's webroot challenges. By default, it redirects all other traffic to the https protocol.
    * `https`: a https server serving the `app` you defined in the previous step. Already listening on port 443. This can contain whatever functionality and routes you add to the `app` parameter.
4. Here is the whole snippet:
    ```javascript
    // index.js
    const express = require('express')
    const autoSsl = require('@appsaloon/auto-ssl')
    const app = express()
    app.get('/', (req, res) => {
     res.send('hello world')
    })
    autoSsl(app)
    ```
    visiting https://www.example.com/ will show the text "hello world". See the official ExpressJS documentation for more possibilities. You can add as many routes and functionality to your app as you'd like.

    You will still need to build this as a docker image using the generated `Dockerfile`, run the docker service on a webhost and acquire a domain name for https to work.
    Make sure to define the correct environment variables for your docker service or `letsencrypt` will not know which domain(s) to register an SSL certificate for ([Deployment](#deployment)).

##### Advanced usage<a name="usage-advanced"></a>
As explained earlier, `server.http` only serves a minimal app which accepts webroot challenges and redirects other traffic to https.
The default https redirect can be replaced with your own custom functionality. To do so, call the `autoSsl` function with a second parameter:
```javascript
    // index.js
    const express = require('express')
    const autoSsl = require('@appsaloon/auto-ssl')
    
    const app = express()
    app.get('/', (req, res) => {
     res.send('hello world')
    })
    
    const httpApp = express()
    httpApp.get('/', (req, res) => {
      res.send('please visit this website securely through https')
    })
    
    autoSsl(app, httpApp)
```
visiting http://www.example.com/ will show the text `please visit this website securely through https`.  
visiting https://www.example.com/ will show the text `hello world`.

With this optional second parameter, `autoSsl` will still return an object, but its `http` property will now contain a server listening on port 80 to accept webroot challenges, and handle the custom routes you defined in `httpApp`. Note that this http server will no longer redirect traffic to https.

### Deployment<a name="deployment"></a>
#### Environment variables<a name="environment"></a>
When deploying your app, the following environment variables must be set:
* `CERT_DOMAINNAMES`: this must be either a single domain name like `www.example.com` or a comma-separated list of domain names like `www.example.com,staging.example.com,api.example.com` that you want to request an SSL certificate for.
* `CERT_EMAIL` the email address to be notified when SSL certificates are about to expire. This package has a cronjob to attempt certificate renewal every week.

#### Volumes<a name="volumes"></a>
It is recommended to set a volume for your docker service or stack, pointing to the following path: `/etc/letsencrypt`. This is a persistent storage for your certificate files, even accross redeployments of the docker service. If this step is omitted, frequent redeployments of your service may cause your domains to reach letsencrypt's weekly rate limit for SSL requests.
