#!/bin/bash

echo "Building Books Service"
cd books
GOOS=linux CGO_ENABLED=0 go build -o books
docker build -t payaljain/sample-service-books:1 .
docker push payaljain/sample-service-books:1
cd ..

echo "Building Borrowers Service"
cd borrowers
GOOS=linux CGO_ENABLED=0 go build -o borrowers
docker build -t payaljain/sample-service-borrowers:1 .
docker push payaljain/sample-service-borrowers:1
cd ..

echo "Deleting existing deployments"
kubectl delete deploy/books
kubectl delete deploy/borrowers

echo "Deploying services to the Kubernetes cluster"
kubectl apply -f sample-services.yaml