FROM debian

# Update
RUN apt-get update && \
    apt-get --yes upgrade

# Install Node.js and NPM
RUN apt-get --yes install curl
RUN curl -sL https://deb.nodesource.com/setup_5.x | bash -
RUN apt-get install --yes nodejs

# Filesystem
COPY . /src

# Install dependancies
RUN cd /src; npm install; npm install -g mocha

# Runtime
EXPOSE 3000
CMD ["node", "/src/index.js"]