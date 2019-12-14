#/bin/bash
echo "Docker Build"
docker build -t payaljain/node-injector-mutating-hook:1 .

echo "Docker Push"
docker push payaljain/node-injector-mutating-hook:1

echo "Clean Up"
kubectl delete secret injector-certs -n custom-mesh
kubectl delete MutatingWebhookConfiguration inject-envoy
kubectl delete -f k8s.yaml
rm -r certs

echo "Creating certs"
mkdir certs && cd certs
openssl genrsa -out ca.key 2048
openssl req -x509 -new -nodes -key ca.key -days 100000 -out ca.crt -subj "/CN=admission_ca"
cat >server.conf <<EOF
[req]
req_extensions = v3_req
distinguished_name = req_distinguished_name
[req_distinguished_name]
[ v3_req ]
basicConstraints = CA:FALSE
keyUsage = nonRepudiation, digitalSignature, keyEncipherment
extendedKeyUsage = clientAuth, serverAuth
subjectAltName = @alt_names
[alt_names]
DNS.1 = injector-svc
DNS.2 = injector-svc.custom-mesh
DNS.3 = injector-svc.custom-mesh.svc
EOF
openssl genrsa -out tls.key 2048
openssl req -new -key tls.key -out server.csr -subj "/CN=injector-svc.custom-mesh.svc" -config server.conf
openssl x509 -req -in server.csr -CA ca.crt -CAkey ca.key -CAcreateserial -out tls.crt -days 100000 -extensions v3_req -extfile server.conf

echo "Creating Namespace"
kubectl create ns custom-mesh

echo "Creating Secret"
kubectl create secret tls injector-certs --cert=tls.crt --key=tls.key -n custom-mesh

cd ..

echo "Installing Webhook Pods"
kubectl apply -f k8s.yaml

echo "Registering Mutating Webhook"
cat <<EOF | kubectl apply -f -
apiVersion: admissionregistration.k8s.io/v1beta1
kind: MutatingWebhookConfiguration
metadata:
  name: inject-envoy
webhooks:
- name: inject-envoy.shekharpatnaik.com
  rules:
  - apiGroups:
    - ""
    apiVersions:
    - v1
    operations:
    - CREATE
    resources:
    - pods
  failurePolicy: Fail
  clientConfig:
    service:
      namespace: custom-mesh
      name: injector-svc
    caBundle: $(cat ./certs/ca.crt | base64 | tr -d '\n')
EOF