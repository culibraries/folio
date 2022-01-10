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

```sh
# Substitute the appropriate version number.
docker build -t culibraries/stripes:<version> .
docker push culibraries/stripes:<version>
```
