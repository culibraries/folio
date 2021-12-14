# We use ubuntu because we want docker and debian/ubuntu is one of just a few supported
# distros for docker hosts.
FROM ubuntu:latest

# bind-tools contains nslookup and dig and a lot of other stuff.
# See https://pkgs.alpinelinux.org/contents?branch=edge&name=bind-tools&arch=x86&repo=main
# for the full contents.
RUN apt update && apt install curl nmap bind-tools postgresql-client

# TODO How to install docker?
