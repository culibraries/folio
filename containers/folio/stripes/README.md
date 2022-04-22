# Building Stripes

The `build-release.sh` file takes care of the details of grabbing the files stripes needs from the remote FOLIO `platform-complete` repo for a given release, performs the builds, and finally pushes the resulting stripes container images to our github container registry.

Our Dockerfile is based on the one found here: https://github.com/folio-org/platform-complete/blob/master/docker/Dockerfile

We customize the Dockerfile a bit, therefore we keep our own Dockerfile, but that's it. Everything else is obtained from the remote repo.

The `build-release.sh` script requires two arguments:
1. The name of the release such as `R3-2021`.
2. The tag to use for the stripes container such as `dev.2021.r3.0`. See below for more
explanation of the tag.
3. The flower release name (i.e. "iris").

In addition, set the `GITHUB_PAT` variable in your environment to your Github Personal Access Token.

## WARNING
This script modifies the pulumi config with details about the stripes and the release so make sure you're in the right pulumi stack where you want to apply these changes.

If you'are in doubt do `pulumi stack ls` to see what stack you're on and `pulumi stack select <stack>` to switch to the right one.

## Versioning
Versioning is intended to reflect the FOLIO release and our iterations for that release  `<env>.YYYY.<release>.<build number>`. Example: For the production third build of our Stripes frontend for Iris (2nd release of 2021), the version number would be `2021.r2.3`. For non production stripes consider: `dev.2021.r2.3`. `Build` numbering will start at `1` for each release.

These releases are then be applied to the cluster via config variables in the index.ts file.

**We use the term "dev" here to refer to non-production environments serviced by the `*.cublcta.com` certificates. These environments can logically be for "testing", "scratch", "staging" or other purposes. The point is that "dev" is non-production.**

## Give docker enough memory
Stripes requires a fair amount of RAM to build.

If you get a SIGINT or similar failure during build it is likely because you don't have enough memory allocated to docker. To fix this on a mac, click on the docker icon in your toolbar, go to Preferences > Advanced and give docker more memory with the slider in the docker GUI.
