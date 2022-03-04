# FOLIO at CU

Project management and source code for FOLIO at University of Colorado Boulder University Libraries.

## FOLIO deployment steps
1. Optionally create a new Pulumi stack for the new deployment if needed. Potentially set new config variables in pulumi for the stack.
1. Review the FOLIO release materials in the `deployments` directory. Are you going to create a new release or use an existing one?
1. Run `pulumi up` from the pulumi directory. This will deploy everything the entire infrastructure from scratch, including all AWS resources. Also deploys an empty database and all the FOLIO modules. Finally pushes out the FOLIO module descriptors to okapi.
1. Run the `register-modules.sh` script. This will register the modules to the tenant.
1. Run `secure-supertenant.py` to secure the supertenant.
1. You should now have a minimally functioning FOLIO system with reference data loaded and be able to log into the supertenant.
1. Migrate any data to the new cluster's database.
1. Run the any scripts in the `scripts` directory related to email configuration. If the URL for the deployment has changed at minimum you'll need to run `email-update-reset.sh` to change the password reset URL to the new URL.

See scripts for scripts that aid deployment post-pulumi.

At minimum review pulumi/index.ts to see what's involved with the deployment code. See the pulumi/README.md details about many of these steps.

## Terminology
We use the term "dev" to refer to non-production environments serviced by the `*.cublcta.com` certificates. These environments can logically be for "testing", "scratch", "staging" or other purposes. "Dev" is non-production. This arrangement allows for the wildcard cert to be used for any environment that is not production making mapping domain such as folio-iris.cublcta.com to a specific (staging, scratch, etc) in-cluster service much easier.
