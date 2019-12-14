const express = require('express')
const app = express()
app.use(express.json())
const https = require('https') // Needed as we need to cater to an HTTPS request
const fs = require('fs')
const privateKey  = fs.readFileSync('./certs/tls.key')
const certificate = fs.readFileSync('./certs/tls.crt')

app.post('/', (req, res) => {
  console.log("Req received", JSON.stringify(req.body))
  let patch = ""
  if (req.body.request.object.metadata.annotations) {
    const annotation = req.body.request.object.metadata.annotations["inject-sidecar"]

    if (annotation == "true") {
      patch = [
        {"op": "add", "path": "/spec/containers/-", "value": {
          "name": "envoy",
          "image": "envoyproxy/envoy"
        }}
      ]
    }
  }

  let baseResponse = {
    "apiVersion": "admission.k8s.io/v1beta1",
    "kind": "AdmissionReview",
    "response": {
      "uid": req.body.request.uid ,
      "allowed": true,
      "patchType": "JSONPatch",
      "patch": patch == "" ? "" : Buffer.from(JSON.stringify(patch)).toString('base64')
    }
  }

  res.json(baseResponse)
})

const run = () => {
  const httpsServer = https.createServer({
      key: privateKey,
      cert: certificate
  }, app)
  httpsServer.listen(443)
  console.log('Server started')
}

run()


