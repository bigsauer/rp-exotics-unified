# Use the official Node.js image
FROM node:22

# Set working directory
WORKDIR /app

# Copy package files first (for better Docker caching)
COPY package.json package-lock.json ./

# Copy the rest of the code (including frontend/)
COPY . .

# Install dependencies and run postinstall (which builds frontend)
RUN npm ci

# Start the backend server
CMD ["node", "backend/server.js"] 