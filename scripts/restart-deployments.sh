#!/bin/bash
if [ "$#" -ne 1 ]
then
  echo "Usage: restart_namespace \$NAMESPACE"
  exit 1
fi

NAMESPACE=$1
echo "Restarting all deployments in $NAMESPACE..."

DEPLOYMENTS=`kubectl get deployments -n $NAMESPACE | tail -n +2 | cut -d ' ' -f 1`
for DEPLOY in $DEPLOYMENTS; do
  kubectl rollout restart deployments/$DEPLOY -n $NAMESPACE
done
