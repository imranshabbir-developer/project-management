# Use Node.js LTS version
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Install dumb-init and procps for ulimit
RUN apk add --no-cache dumb-init procps

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application files
COPY . .

# Create uploads directory
RUN mkdir -p uploads/general uploads/onboarding

# Set environment to production
ENV NODE_ENV=production

# Expose port
EXPOSE 5000

# Create startup script to set ulimits
RUN echo '#!/bin/sh' > /start.sh && \
    echo 'ulimit -n 65536' >> /start.sh && \
    echo 'exec dumb-init -- node server.js' >> /start.sh && \
    chmod +x /start.sh

# Use startup script
ENTRYPOINT ["/start.sh"]

