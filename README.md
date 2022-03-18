# FOLIO at CU

Project management, documentation, and mono-repo for FOLIO at University of Colorado Boulder University Libraries.

## FOLIO on AWS k8s: deployment steps
There are two parts to deployment: running `pulumi up` and then running some shell scripts after pulumi.
* The pulumi portion deploys a complete AWS infrastructure, a FOLIO system, and then pushes module deployment descriptors into okapi.
* We use shell scripts to create the tenant, register modules to the tenant, bootstrap the superuser and secure the supertenant.

Steps in more detail:
1. Optionally create a new Pulumi stack for the new deployment if needed. Potentially set new config variables in pulumi for the stack.
1. Review the FOLIO release materials in the `deployments` directory. Are you going to create a new release or use an existing one?
1. Run `pulumi up` from the pulumi directory. This will deploy everything the entire infrastructure from scratch, including all AWS resources. Also deploys an empty database and all the FOLIO modules. Finally pushes out the FOLIO module descriptors to okapi.
1. Run the `create-tenant.sh` script. This will create one tenant based on the name in the script.
1. Run the `register-modules.sh` script. This will register the modules in the deployment to the tenant.
1. Create an entry in Route 53 to point to the okapi service's DNS entry. This will allow for the next step to work.
1. Create an entry in Rout3 53 to point to the stripes service's DNS entry.
1. Review the source and run the `bootstrap-superuser.sh` script per the instructions there.
1. You should now have a minimally functioning FOLIO system with reference data loaded and be able to log in as the superuser through the .
1. Run `secure-supertenant.py` to secure the supertenant.
1. Migrate any data to the new cluster's database.
1. Run the any scripts in the `scripts` directory related to email configuration. If the URL for the deployment has changed at minimum you'll need to run `email-update-reset.sh` to change the password reset URL to the new URL.

See the `/scripts` directory for scripts that aid deployment after pulumi pulumi.

At minimum review [index.ts](./pulumi/folio/index.ts) to see what's involved with the deployment code. See the main [README](./pulumi/README.md) details about many of these steps.

## Terminology
We use the term "dev" to refer to non-production environments serviced by the `*.cublcta.com` certificates. These environments can logically be for "testing", "scratch", "staging" or other purposes. "Dev" is non-production. This arrangement allows for the wildcard cert to be used for any environment that is not production making mapping domain such as folio-iris.cublcta.com to a specific (staging, scratch, etc) in-cluster service much easier.
