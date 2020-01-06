const Client = require('kubernetes-client').Client
const RequestKubernetes = require('kubernetes-client/backends/request')
const JSONStream = require('json-stream')
let backend

backend = new RequestKubernetes(RequestKubernetes.config.getInCluster())
const client = new Client({ backend, version: '1.13' })

const watch = (callback) => {
  const stream = client.api.v1.watch.namespaces('').services.getStream()
  const services = new JSONStream()
  stream.pipe(services)
  services.on('data', svc => {
    console.log('Event: ', JSON.stringify(svc, null, 2))
    let response = {
      "name": svc.object.metadata.name,
      "namespace": svc.object.metadata.namespace ,
      "action": svc.type,
      "port": svc.object.spec.ports[0]["port"]
    }

    callback (response)
  })
}

module.exports = {
  watch
}