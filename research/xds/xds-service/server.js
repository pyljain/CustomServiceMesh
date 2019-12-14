const express = require('express')

const app = express()

app.use(express.json())

const logMiddleware = (req, res, next) => {
  console.log('Request Body', req.body)
  console.log('Request Method', req.method)
  console.log('Request Path', req.originalUrl)
  next()
}

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
  res.json({
    "version_info": "v2",
    "resources": [{
      "@type": "type.googleapis.com/envoy.api.v2.Cluster",
      "name": "nginx_cluster",
      "connect_timeout": "0.25s",
      "lb_policy": "ROUND_ROBIN",
      "type": "strict_dns",
      "dns_lookup_family": "V4_ONLY",
      "hosts": [{
        "socket_address": {
          "address": "nginx",
          "port_value": 80
        }
      }]
    }, {
      "@type": "type.googleapis.com/envoy.api.v2.Cluster",
      "name": "random_backend",
      "connect_timeout": "0.25s",
      "lb_policy": "ROUND_ROBIN",
      "type": "LOGICAL_DNS",
      "dns_lookup_family": "V4_ONLY",
      "hosts": [{
        "socket_address": {
          "address": "bing.com",
          "port_value": 443
        }
      }]
    }]
  })
}

function getListeners(req, res) {
  console.log('Here in listeners route')
  res.json({
    "version_info": "3",
    "resources": [{
      "@type": "type.googleapis.com/envoy.api.v2.Listener",
      name: 'listener_http3',
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
                    cluster: 'nginx_cluster'
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
    }]
  })
}

app.listen(80, () => console.log('XDS Server Started'))
