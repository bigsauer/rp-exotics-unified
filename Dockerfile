# Use the official Node.js image
FROM node:22

# Set working directory for the app
WORKDIR /app

# Copy all files into the image
COPY . .

# Set working directory to backend for dependency install
WORKDIR /app/backend

# Install backend dependencies
RUN npm ci

# Start the backend server
CMD ["node", "server.js"] 