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
    const podName = req.body.request.object.metadata.name
    const podNamespace = req.body.request.object.metadata.namespace


    if (annotation == "true") {
      patch = [
        {
          "op": "add",
          "path": "/spec/containers/-",
          "value": {
            "name": "envoy",
            "image": "envoyproxy/envoy",
            "args": [
              "-c",
              "/etc/envoy/envoy.yaml",
              "--service-cluster",
              "podNamespace",
              "--service-node",
              "podName",
              "-l",
              "trace"
            ],
            "volumeMounts": [
              {
                "name": "envoy-default-config",
                "mountPath": "/etc/envoy"
              }

            ]
          }
        },
        {
          "op": "add",
          "path": "/spec/volumes/-",
          "value": {
            "name": "envoy-default-config",
            "configMap": {
              "name": "envoy-config"
            }
          }
        }
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


