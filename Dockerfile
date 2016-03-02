FROM debian

# Update
RUN apt-get update && \
    apt-get --yes upgrade

# Install Node.js and NPM
RUN apt-get --yes install curl
RUN apt-get --yes install build-essential
RUN curl -sL https://deb.nodesource.com/setup_5.x | bash -
RUN apt-get install --yes nodejs
RUN apt-get install --yes git-core
RUN apt-get clean

# Filesystem
COPY . /src

# Install dependancies
RUN cd /src; npm install;

# Runtime
EXPOSE 3000
CMD cd /src; npm start;