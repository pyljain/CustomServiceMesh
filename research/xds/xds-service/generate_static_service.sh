grpc_tools_node_protoc \
  --js_out=import_style=commonjs,binary:./static_codegen/ \
  --grpc_out=./static_codegen \
  --plugin=protoc-gen-grpc=`which grpc_tools_node_protoc_plugin` \
  ./envoy/api/v2/cds.proto