const express = require('express')

const app = express()

app.use(express.json())

const kubeLibraries = require('./kube')

let services = []

const logMiddleware = (req, res, next) => {
  console.log('Request Body', req.body)
  console.log('Request Method', req.method)
  console.log('Request Path', req.originalUrl)
  next()
}

// Needed to escape the ":" that is sent along with the action name when
// this route is invoked - example: /v2/discovery:clusters
app.post('/v2/discovery::action', logMiddleware, (req, res) => {
  if (req.params.action == 'clusters') {
    getClusters(req, res)
  } else if (req.params.action == 'listeners') {
    getListeners(req, res)
  } else {
    res.sendStatus(404)
  }
})

function getClusters(req, res) {
  console.log('in getclusters')
  const resources = services.map((svc) => {
    return {
      "@type": "type.googleapis.com/envoy.api.v2.Cluster",
      "name": svc.name + '_' + svc.namespace + '_' + 'cluster',
      "connect_timeout": "0.25s",
      "lb_policy": "ROUND_ROBIN",
      "type": "strict_dns",
      "dns_lookup_family": "V4_ONLY",
      "hosts": [{
        "socket_address": {
          "address": svc.name + '.' + svc.namespace,
          "port_value": 10000 // Destination Envoy PORT
        }
      }]
    }
  })



  res.json({
    "version_info": "v2",
    "resources": resources
  })
}

function getListeners(req, res) {
  console.log('Here in listeners route')
  res.json({
    "version_info": "3",
    "resources": [{
      "@type": "type.googleapis.com/envoy.api.v2.Listener",
      name: 'listener_external',
      address: {
        socket_address: {
          address: '0.0.0.0',
          port_value: 10000
        }
      },
      filter_chains: [{
        filters: [{
          name: 'envoy.http_connection_manager',
          config: {
            access_log: {
              name: 'envoy.file_access_log',
              config: {
                path: '/dev/stdout'
              }
            },
            stat_prefix: 'ingress_http',
            codec_type: 'AUTO',
            route_config: {
              name: 'local_route',
              virtual_hosts: [{
                name: 'local_service',
                domains: ["*"],
                routes: [{
                  match: {
                    prefix: "/"
                  },
                  route: {
                    // host_rewrite: 'www.google.com',
                    cluster: 'local_cluster'
                  }
                }]
              }]
            },
            "http_filters": [
                {
                    "name": "envoy.router"
                }
            ]
          }
        }]
      }]
    },
    {
      "@type": "type.googleapis.com/envoy.api.v2.Listener",
      name: 'listener_local',
      address: {
        socket_address: {
          address: '127.0.0.1',
          port_value: 8080
        }
      },
      filter_chains: [{
        filters: [{
          name: 'envoy.http_connection_manager',
          config: {
            access_log: {
              name: 'envoy.file_access_log',
              config: {
                path: '/dev/stdout'
              }
            },
            stat_prefix: 'ingress_http',
            codec_type: 'AUTO',
            route_config: {
              name: 'local_route',
              virtual_hosts: [{
                name: 'local_service',
                domains: ["*"],
                routes: services.map((svc) => {
                  return {
                    match: {
                      prefix: `/${svc.name}.${svc.namespace}/`
                    },
                    route: {
                      prefix_rewrite: '/',
                      cluster: `${svc.name}_${svc.namespace}_cluster`
                    }
                  }
                })
              }]
            },
            "http_filters": [
                {
                    "name": "envoy.router"
                }
            ]
          }
        }]
      }]
    }
  ]
  })
}

const run = () => {
  app.listen(80, () => console.log('XDS Server Started'))
  kubeLibraries.watch((svc) => {
    console.log("NEW SVC DETAIL", svc)
    if (svc.action == "ADDED") {
      services.push(svc)
    } else if (svc.action == "DELETED") {
      services = services.filter((existingSvc) => {
        return existingSvc.name != svc.name && existingSvc.namespace != svc.namespace
      })
    }
  })
}

run()