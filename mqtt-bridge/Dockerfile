FROM node:18-slim

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
COPY package*.json ./
RUN npm install

# Bundle app source
COPY . .

# Set environment variables
ENV NODE_ENV=production
ENV WS_PORT=3001

# Expose the port
EXPOSE 3001

# Start the bridge
CMD [ "node", "index.js" ]
