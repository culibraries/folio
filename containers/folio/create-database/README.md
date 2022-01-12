To push any changes to this container to our github package hub:

1. Get a Personal Access Token
2. Export it to your env
3. Login
4. Push to it

```shell
export CR_PAT=YOUR_TOKEN
docker build . --tag ghcr.io/culibraries/create_database:latest
echo $CR_PAT | docker login ghcr.io -u USERNAME --password-stdin
docker push ghcr.io/culibraries/create_database:latest
```
