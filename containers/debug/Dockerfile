FROM alpine:latest

# bind-tools contains nslookup and dig and a lot of other stuff.
# See https://pkgs.alpinelinux.org/contents?branch=edge&name=bind-tools&arch=x86&repo=main
# for the full contents.
RUN apk update && apk add curl nmap bind-tools postgresql-client
