# We use ubuntu because we want docker and debian/ubuntu is one of just a few supported
# distros for docker hosts.
FROM ubuntu:latest

# We need to run all this in non-interactive mode.
ENV DEBIAN_FRONTEND noninteractive

# Get the latest stuff.
RUN apt-get update

# Install curl passing -y since we're in non-interactive mode. This is required for
# docker installation which is by far the most complicated part of this container's setup.
RUN apt-get install \
    curl -y

# Install docker because we may want to run containers inside the debug container.
# Since this is the debug container we use the convenience script.
# Reference: https://docs.docker.com/engine/install/ubuntu/#install-using-the-convenience-script
RUN curl -fsSL https://get.docker.com -o get-docker.sh
RUN sh get-docker.sh

# Install the other stuff we care about.
RUN apt-get install -y \
    nmap dnsutils postgresql-client

# NOTE to debug this container just start it using the interactive terminal or -it flag.
# For example:
# docker run -it  ghcr.io/culibraries/debug_container:latest
