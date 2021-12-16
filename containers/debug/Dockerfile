FROM ubuntu:latest

# We need to run all this in non-interactive mode.
ENV DEBIAN_FRONTEND noninteractive

# Get the latest stuff.
RUN apt-get update

# Install the other stuff we care about.
RUN apt-get install -y \
    curl nmap dnsutils postgresql-client

# NOTE to debug this container just start it using the interactive terminal or -it flag.
# For example:
# docker run -it  ghcr.io/culibraries/debug_container:latest
