# Use the official Node.js image
FROM node:22

# Set working directory
WORKDIR /app

# Copy package files and install dependencies
COPY package.json package-lock.json ./
RUN npm ci

# Copy the rest of the code
COPY . .

# Build the frontend
WORKDIR /app/frontend
RUN npm install && npm run build

# Set working directory back to root
WORKDIR /app

# Start the backend server
CMD ["node", "backend/server.js"] 