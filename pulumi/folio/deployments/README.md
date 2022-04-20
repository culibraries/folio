This directory contains module names and versions for a given deployment. This file is used in two ways:
* It is iterated by the folio.ts file to obtain the module names and versions which should be deployed via helm for a given deployment. This deployment only happens if a module's "action" property is "enable". So to bypass a module and not install it
set it to "disable".
* It is posted to okapi in the register-modules.sh script to enable the modules for a tenant in okapi as one of the last steps in a deployment.

The modules and versions for a deployment, which may map to a flower release, can be obtained from the [platform-complete repository](https://github.com/folio-org/platform-complete) and the install.json file there.

In platform-complete there are branches for each flower release and a given branch contains the install.json for that release.
