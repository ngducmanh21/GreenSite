FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json tsconfig.base.json ./
COPY packages/contracts/package.json packages/contracts/package.json
COPY backend/package.json backend/package.json
COPY frontend/package.json frontend/package.json
RUN npm ci --ignore-scripts
COPY packages/contracts packages/contracts
COPY backend backend
RUN npm run build:backend

FROM node:24-alpine AS backend-runtime
WORKDIR /app
ENV NODE_ENV=production HOST=0.0.0.0
COPY --from=build /app/backend/dist ./backend/dist
COPY --from=build /app/backend/package.json ./backend/package.json
COPY --from=build /app/packages/contracts/dist ./node_modules/@greensite/contracts/dist
COPY --from=build /app/packages/contracts/package.json ./node_modules/@greensite/contracts/package.json
RUN mkdir -p /app/data && chown node:node /app/data
USER node
HEALTHCHECK --interval=15s --timeout=8s --start-period=15s --start-interval=2s --retries=3 CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/health/ready',{headers:{'X-Service-Token':process.env.INTERNAL_SERVICE_TOKEN}}).then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

FROM backend-runtime AS sites
ENV PORT=4001 DATABASE_PATH=/app/data/greensite.sqlite
EXPOSE 4001
CMD ["node", "backend/dist/services/sites/main.js"]

FROM backend-runtime AS energy
ENV PORT=4002
EXPOSE 4002
CMD ["node", "backend/dist/services/energy/main.js"]

FROM backend-runtime AS assistant
ENV PORT=4003
EXPOSE 4003
CMD ["node", "backend/dist/services/assistant/main.js"]

FROM backend-runtime AS gateway
ENV PORT=4000
EXPOSE 4000
CMD ["node", "backend/dist/services/gateway/main.js"]
