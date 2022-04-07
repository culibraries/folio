# Installs the cluster resources needed to enable AWS CloudWatch metrics.
# These metrics are available in our CloudWatch dashboard.
# To view the metrics generated to to /aws/containerinsights/<cluster name>/performance
# in the AWS console.

# For the AWS docs on this see: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/Container-Insights-setup-metrics.html
# For some pulumi customizations of this ee https://www.pulumi.com/docs/guides/crosswalk/kubernetes/cluster-services/#install-cloudwatch-agent

# Create the namespace
kubectl apply -f https://raw.githubusercontent.com/aws-samples/amazon-cloudwatch-container-insights/latest/k8s-deployment-manifest-templates/deployment-mode/daemonset/container-insights-monitoring/cloudwatch-namespace.yaml

# Create the ServiceAccount
kubectl apply -f https://raw.githubusercontent.com/aws-samples/amazon-cloudwatch-container-insights/latest/k8s-deployment-manifest-templates/deployment-mode/daemonset/container-insights-monitoring/cwagent/cwagent-serviceaccount.yaml

# Create the ConfigMap
# Note as an alternative this config map could be downloaded localy and modified
# to customize the configuration.
curl -s https://raw.githubusercontent.com/aws-samples/amazon-cloudwatch-container-insights/master/k8s-yaml-templates/cwagent-kubernetes-monitoring/cwagent-configmap.yaml | sed -e "s#{{cluster_name}}#`pulumi stack output eksClusterName`#g" | kubectl apply -f -

# Create the DaemonSet
kubectl apply -f https://raw.githubusercontent.com/aws-samples/amazon-cloudwatch-container-insights/master/k8s-yaml-templates/cwagent-kubernetes-monitoring/cwagent-daemonset.yaml

# Validate
kubectl get pods -n amazon-cloudwatch
