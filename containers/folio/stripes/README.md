# Stripes

Container is based on the one found here: https://github.com/folio-org/platform-complete/blob/master/docker/Dockerfile

## Changing the hostname for the Stripes frontend

- Update hostname in `Dockerfile` and `stripes.config.js`.
- Build and deploy the container

## Getting the correct versions of packages

We want to make sure that we are building the correct Stripes frontend for a flower release. There are several files that we need to copy and modify (or maintain our modifications to):

- `stripes.config.js`
- `package.json`
- `yarn.lock`

These files can be found on the release branches of the `folio-org/platform-complete` repository, like the [R2 2021 branch](https://github.com/folio-org/platform-complete/tree/R2-2021)

- [ ] TODO figure out what the `renovate.js` file in the folio repo is for.

## Building the container

Versioning is intended to reflect the FOLIO release and our iterations for that release  `YYYY.release.build`. Example: For the third build of our Stripes frontend for Iris (2nd release of 2021), the version number would be `2021.r2.3`. `Build` numbering will start at `1` for each release.

```shell
docker build -t ghcr.io/culibraries/folio_stripes:<version> .
```

### Give docker enough memory
Stripes requires a fair amount of RAM to build.

If you get a SIGINT or similar failure during build it is likely because you don't have enough memory allocated to docker. To fix this on a mac, click on the docker icon in your toolbar, go to Preferences > Advanced and give docker more memory with the slider in the docker GUI.

### Pushing the container

For the rebuilt container to be used by pulumi you'll need to push it out to ghcr.

To push any changes to this container to our github package hub:

1. Get a Personal Access Token
2. Export it to your env
3. Login
4. Push to it

```shell
export CR_PAT=YOUR_TOKEN
echo $CR_PAT | docker login ghcr.io -u USERNAME --password-stdin
docker push ghcr.io/culibraries/folio_stripes:<version>
```
