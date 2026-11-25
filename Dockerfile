# QAOA Visualizer — single-container deploy (e.g. Render free Web Service).
# Stage 1 builds the frontend; stage 2 runs the FastAPI backend, which
# also serves the built frontend (see FRONTEND_DIST in backend/app/main.py).

FROM node:22-slim AS frontend
WORKDIR /build
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM python:3.12-slim
WORKDIR /app
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY backend/app ./app
COPY --from=frontend /build/dist ./frontend-dist
ENV FRONTEND_DIST=/app/frontend-dist
# Keep thread pools small: free tiers give a fraction of a CPU and
# Qiskit/Aer otherwise spawns one worker thread per core it can see.
ENV OMP_NUM_THREADS=1
ENV OPENBLAS_NUM_THREADS=1
ENV MKL_NUM_THREADS=1
# Render (and most PaaS) inject the port to listen on as $PORT.
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000} --workers 1"]
