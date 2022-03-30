# FOLIO at CU

Project management, documentation, and mono-repo for FOLIO at University of Colorado Boulder University Libraries.

## FOLIO on AWS EKS: deployment steps
There are two parts to deployment: running `pulumi up` and then running some shell scripts after pulumi.
* The pulumi portion deploys a complete AWS infrastructure, a FOLIO system, and then pushes module deployment descriptors into okapi.
* We use shell scripts to create the tenant, register modules to the tenant, bootstrap the superuser and secure the supertenant.

Steps in more detail:
1. Optionally create a new Pulumi stack for the new deployment if needed. Potentially set new config variables in pulumi for the stack.
1. Review the FOLIO release materials in the `deployments` directory. Are you going to create a new release or use an existing one?
1. Run `pulumi up` from the pulumi directory. This will deploy everything in the entire infrastructure from scratch, including all AWS resources. Also deploys an empty AWS RDS database cluster and all the FOLIO modules. Finally it pushes out the FOLIO module descriptors to okapi. At this point you can export the kubeconfig file from the pulumi stack and use it to connect to the cluster to see the resources there. Try `kubectl get pods` or `kubectl logs <okapi pod name> -f` to follow the okapi logs.
1. Still on your local machine, run the `create-tenant.sh` script. This will create one tenant based on the name in the script.
1. Port forward the okapi port in the cluster a port on localhost. Run the `register-modules.sh` script using the port on localhost for the okapi url. This will register the modules in the deployment to the tenant. You should now be able to see all of the modules that you have registered to the tenant by visiting `http://localhost:9000/_/proxy/tenants/cubl/modules`.
1. Create an entry in Route 53 to point to the okapi service's DNS address. Get the service dns by doing `get services` in the k8s cluster. This will allow for the next step (bootstrapping superuser) to work.
1. Review the source and run the `bootstrap-superuser.sh` script per the instructions there. The superuser's name and password are available by doing `pulumi config --show-secrets`. Set these in your local env to use the script.
1. Create an entry in Route 53 to point to the stripes service's DNS entry. If you visit this new URL you should see the FOLIO frontend app (stripes). Try logging in with the superuser.
1. You should now have a minimally functioning FOLIO system with reference data loaded and/or sample data if you chose in `register-modules.sh` to load the sample data.
1. Run `secure-supertenant.py` to secure the supertenant.
1. Should you want to connect your new instance to a different database cluster, first create that cluster either by cloning or restoring an existing cluster's RDS snapshot. Then set the pulumi configuration `db-cluster-identifier` key to be the cluster identifier for the cluster you wish to connect.
1. Review and run the scripts in the `scripts` directory related to email configuration. If the URL for the deployment has changed at minimum you'll need to run `email-update-reset.sh` to change the password reset URL to the new URL.

Before running `pulumi up` at minimum review [index.ts](./pulumi/folio/index.ts) to see what's involved with the deployment code. See the main [README](./pulumi/README.md) for details of many of these steps.

## Terminology
We use the term "dev" to refer to non-production environments serviced by the `*.cublcta.com` certificates. These environments can logically be for "testing", "scratch", "staging" or other purposes. "Dev" is non-production. This arrangement allows for the wildcard cert to be used for any environment that is not production making mapping domains such as `folio-iris.cublcta.com` to a specific (staging, scratch, etc) in-cluster service much easier.
