# Dockerfile for Dark Factory generated apps
FROM node:22-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --omit=dev

# Copy application files
COPY . .

# Expose port (Fly.io will map this internally)
EXPOSE 8080

# Start the application
CMD ["npm", "start"]
