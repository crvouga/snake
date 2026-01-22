# Use Node.js as the build environment
FROM node:18-alpine AS build

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci

# Install platform-specific Rollup native binary for Alpine Linux
# Vite/Rollup needs this for native performance on Alpine (musl libc)
# Detect architecture and install the appropriate package
RUN ARCH=$(uname -m) && \
    if [ "$ARCH" = "aarch64" ] || [ "$ARCH" = "arm64" ]; then \
    npm install @rollup/rollup-linux-arm64-musl --save-optional; \
    else \
    npm install @rollup/rollup-linux-x64-musl --save-optional; \
    fi

# Copy all files
COPY . .

# Build the app
RUN npm run build

# Use Nginx for serving the built app
FROM nginx:alpine

# Copy custom nginx config for SPA routing
RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/

# Copy built files from the build stage to nginx serve directory
COPY --from=build /app/dist /usr/share/nginx/html

# Expose port 80
EXPOSE 80

# Start Nginx server
CMD ["nginx", "-g", "daemon off;"]
