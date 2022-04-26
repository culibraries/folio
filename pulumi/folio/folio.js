"use strict";
exports.__esModule = true;
exports.deploy = exports.prepare = void 0;
var k8s = require("@pulumi/kubernetes");
var prepare;
(function (prepare) {
    function jobContainers(modules) {
        var imageName = "folioci/folio-okapi-registration";
        var initContainers = [];
        for (var _i = 0, modules_1 = modules; _i < modules_1.length; _i++) {
            var module_1 = modules_1[_i];
            initContainers.push(createJobContainer(module_1, imageName));
        }
        return initContainers;
    }
    prepare.jobContainers = jobContainers;
    function createJobContainer(m, image) {
        return {
            // NOTE folio-helm has a mechanism for registering the front-end mods. Don't use it!
            // It only installs the snapshot versions of these mods. We need specific
            // versions of these modules, so we register them using our deployment module
            // list which is generated for the release we care about.
            // K8s doesn't allow underscores in names, so replace that with a dash. Front-end
            // mods have an underscore in their names.
            name: "register-module-".concat(m.name.replace('_', '-')),
            image: image,
            env: [
                { name: "OKAPI_URL", value: m.okapiUrl },
                { name: "MODULE_NAME", value: m.name },
                { name: "MODULE_VERSION", value: m.version },
                // Setting this to empty allows us to bypass module registration, which
                // we don't want to do here. See the script for how this works.
                { name: "TENANT_ID", value: "" },
            ]
        };
    }
})(prepare = exports.prepare || (exports.prepare = {}));
var deploy;
(function (deploy) {
    function configMap(name, data, labels, cluster, namespace, dependsOn) {
        return new k8s.core.v1.ConfigMap(name, {
            metadata: {
                name: name,
                labels: labels,
                namespace: namespace.id
            },
            data: data
        }, {
            provider: cluster.provider,
            dependsOn: dependsOn
        });
    }
    deploy.configMap = configMap;
    function secret(name, data, labels, cluster, namespace, dependsOn) {
        return new k8s.core.v1.Secret(name, {
            metadata: {
                name: name,
                labels: labels,
                namespace: namespace.id
            },
            data: data
        }, {
            provider: cluster.provider,
            dependsOn: dependsOn
        });
    }
    deploy.secret = secret;
    /**
     * Deploy okapi along with a LoadBalancer service to handle external traffic.
     * @param module The module object for okapi.
     * @param certArn The AWS certificate ARN of the certificate that will be used to secure traffic.
     * @param cluster A reference to the k8s cluster.
     * @param namespace A reference to the k8s namespace.
     * @param dependsOn The resources that okapi depends on being live before deploying.
     * @returns A reference to the helm release object for this deployment.
     */
    function okapi(module, certArn, cluster, namespace, dependsOn) {
        var values = {
            // Get the image from the version associated with the release.
            image: {
                tag: module.version,
                repository: "".concat(module.containerRepository, "/").concat(module.name)
            },
            fullnameOverride: module.name,
            // For documentation on the annotations and other configuration options see:
            // https://aws.amazon.com/premiumsupport/knowledge-center/terminate-https-traffic-eks-acm/
            service: {
                type: "LoadBalancer",
                // This port must be 9130 since that is where the other pods in the cluster
                // expect OKAPI to be available. This means that all external requests to okapi
                // must have the port number on the URL.
                port: 9130,
                containerPort: 9130,
                annotations: {
                    "service.beta.kubernetes.io/aws-load-balancer-backend-protocol": "http",
                    "service.beta.kubernetes.io/aws-load-balancer-ssl-cert": "".concat(certArn),
                    // Only run ssl on port named http. This is the only port name that folio-helm
                    // makes available.
                    "service.beta.kubernetes.io/aws-load-balancer-ssl-ports": "http"
                }
            },
            // The postJob value in the folio-helm chart is very unreliable. We don't use it and
            // instead create our own job that runs after all modules have been installed.
            postJob: {
                enabled: false
            },
            resources: {
                limits: {
                    memory: module.limitsMemory
                },
                requests: {
                    memory: module.requestsMemory
                }
            }
        };
        return deployHelmChart(module.name, module.name, cluster, namespace, values, dependsOn);
    }
    deploy.okapi = okapi;
    /**
     * Deploys stripes using a helm chart. Unlike our other charts, which pull their containers
     * from the folio container registry, this container must be built and deployed to a self-hosted
     * container repository. This also deploys a LoadBalancer service which provides external
     * access to the container.
     * @param isDev Whether or not to deploy this resource as a dev resource or a production one.
     * @param repository The container repository to get the container from.
     * @param tag The tag of the build to use for the container.
     * @param certArn The AWS ARN of the cert to bind to the service.
     * @param cluster A reference to the cluster where we are deploying.
     * @param namespace A reference to the namespace.
     * @param dependsOn Any dependencies.
     * @returns A reference to the helm release for this.
     */
    function stripes(isDev, repository, tag, certArn, cluster, namespace, dependsOn) {
        // Platform complete is the somewhat oddly named folio-helm chart for deploying stripes.
        // We deploy two different types, one for development certificates and URLs at *.cublcta.com
        // and one for production at folio.colorado.edu.
        var resourceName = isDev ? "platform-complete-dev" : "platform-complete";
        var chartName = "platform-complete";
        var values = {
            // Get the image from the version associated with the release.
            image: {
                tag: tag,
                repository: repository
            },
            fullnameOverride: resourceName,
            // For documentation on the annotations and other configuration options see:
            // https://aws.amazon.com/premiumsupport/knowledge-center/terminate-https-traffic-eks-acm/
            service: {
                type: "LoadBalancer",
                port: 443,
                containerPort: 80,
                annotations: {
                    "service.beta.kubernetes.io/aws-load-balancer-backend-protocol": "http",
                    "service.beta.kubernetes.io/aws-load-balancer-ssl-cert": "".concat(certArn),
                    // Only run ssl on port named http. This is the only port name that folio-helm
                    // makes available.
                    "service.beta.kubernetes.io/aws-load-balancer-ssl-ports": "http"
                }
            },
            // The postJob value in the folio-helm chart is very unreliable. We don't use it and
            // instead create our own job that runs after all modules have been installed.
            postJob: {
                enabled: false
            }
        };
        return deployHelmChart(resourceName, chartName, cluster, namespace, values, dependsOn);
    }
    deploy.stripes = stripes;
    /**
     * Deploys the provided list of folio modules. This should be used for any module
     * that requires a ClusterIp type of service (so not okapi, and probably not an edge
     * module).
     * @param cluster A reference to the k8s cluster.
     * @param namespace A reference to the k8s namespace.
     * @param toDeploy The modules to deploy.
     * @returns A list of the module resources.
     */
    function modules(toDeploy, cluster, namespace, okapiReleases) {
        // Filter out okapi and the front-end modules. Okapi is deployed separately
        // prior to deploying the modules. Also, the front-end modules are only relevant
        // later when they need to be registered to okapi. In other words, they are not
        // containers that get deployed, like the regular modules.
        toDeploy = toDeploy.filter(function (module) { return module.name !== "okapi"; })
            .filter(function (module) { return !module.name.startsWith("folio_"); });
        var moduleReleases = [];
        for (var _i = 0, toDeploy_1 = toDeploy; _i < toDeploy_1.length; _i++) {
            var module_2 = toDeploy_1[_i];
            var values = getModuleValues(module_2);
            var moduleRelease = deployHelmChart(module_2.name, module_2.name, cluster, namespace, values, okapiReleases);
            moduleReleases.push(moduleRelease);
        }
        return moduleReleases;
    }
    deploy.modules = modules;
    function getModuleValues(module) {
        var values = {
            // Get the image from the version associated with the release.
            image: {
                tag: module.version,
                repository: "".concat(module.containerRepository, "/").concat(module.name)
            },
            fullnameOverride: module.name,
            // The postJob value in the folio-helm chart is very unreliable. We don't use it and
            // instead create our own job that runs after all modules have been installed.
            postJob: {
                enabled: false
            },
            resources: {
                limits: {
                    memory: module.limitsMemory
                },
                requests: {
                    memory: module.requestsMemory
                }
            },
            // 20 is what TAMU is using.
            dbMaxPoolSize: 20
        };
        // The folio-helm mod-authtoken helm chart hardcodes the signing key. See:
        // https://github.com/folio-org/folio-helm/blob/1f11f54ade1b00eff92427b549764a73e7ec21bf/mod-authtoken/values.yaml#L83
        // This is bad since it means not only that your signing key is available to the world in
        // this public repository if you fail to notice this when using the chart, but it also
        // means that the default behavior of mod-authtoken (getting random singing key)
        // is overridden. Since FOLIO currently has no way to revoke a token, the only way
        // to 'reset' a compromised system is to restart mod-authtoken with a new random key
        // or to pass in a new signing key as a java option.
        if (module.name.startsWith("mod-authtoken")) {
            values.javaOptions = "-XX:MaxRAMPercentage=85.0 -XX:+UseG1GC -Dcache.permissions=true";
        }
        return values;
    }
    /**
     * Deploys the module deployment descriptors for the deployment.
     * @param name The name of the job.
     * @param namespace Reference to the namespace.
     * @param cluster Reference to the cluster.
     * @param modules The modules to deploy. Can include front and backend modules.
     * @param dependsOn Resources that this job depends on.
     * @returns A reference to the job.
     */
    function deployModuleDescriptors(name, namespace, cluster, modules, dependsOn) {
        var jobContainers = prepare.jobContainers(modules);
        return new k8s.batch.v1.Job(name, {
            metadata: {
                name: name,
                namespace: namespace.id
            },
            spec: {
                template: {
                    spec: {
                        containers: jobContainers,
                        restartPolicy: "Never"
                    }
                },
                backoffLimit: 0
            }
        }, {
            provider: cluster.provider,
            dependsOn: dependsOn,
            deleteBeforeReplace: true
        });
    }
    deploy.deployModuleDescriptors = deployModuleDescriptors;
    function deployHelmChart(resourceName, chartName, cluster, namespace, values, dependsOn) {
        return new k8s.helm.v3.Release(resourceName, {
            namespace: namespace.id,
            name: resourceName,
            chart: chartName,
            repositoryOpts: {
                repo: "https://folio-org.github.io/folio-helm/"
            },
            values: values,
            // This is the default, but bringing it to the surface here so that we know
            // about this feature of pulumi helm releases. This is a very good thing
            // as it lets us make other resources truly dependent on this release being
            // complete.
            skipAwait: false,
            // 5 minutes. The default is 5 minutes. After this time the helm release will
            // return as complete, so we have to be careful here to make sure we're waiting
            // long enough. This timeout is a backstop if something has gone wrong. Otherwise
            // pulumi knows how to wait for the release to be complete. See note on skipAwait
            // above.
            timeout: 300
            // We don't specify the chart version. The latest chart version will be deployed.
            // https://www.pulumi.com/registry/packages/kubernetes/api-docs/helm/v3/chart/#version_nodejs
        }, {
            provider: cluster.provider,
            // This allows for any changes to the module's helm-chart params to result in a replacing
            // change to the pod.
            deleteBeforeReplace: true,
            dependsOn: dependsOn
        });
    }
})(deploy = exports.deploy || (exports.deploy = {}));
