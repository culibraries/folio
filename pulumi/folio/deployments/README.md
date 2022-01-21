The yaml files in this directory contain all configuration information that is needed for a given FOLIO deployment (outside of what is in the pulumi config). This includes the modules and their versions. The modules and versions for a given deployment, which may map to a flower release, can be obtained from the [platform-complete repository](https://github.com/folio-org/platform-complete) and the install.json file there.

In platform-complete there are branches for each flower release.

There is also a script here (json2yaml.ts) which can convert the JSON list of modules from install.json to our modules yaml array. It doesn't write directly to the yaml config for a deployment however. Instead it is expected that the output file produced by the script be cut and pasted into the deployment's config file which should be manually created and named in a manner that shows what release it is for.

Once the output file has served its purpose it can be deleted.

To run compile the json2yaml.ts file do `tsc json2yaml.ts`. To run it do `node json2yaml.js`. If you don't have `tsc` (the typescript compiler) do `npm install typescript -g`.
