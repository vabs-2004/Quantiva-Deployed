FROM node:20-bookworm-slim

# --------------------------------------------------
# Install Python 3.11 and virtual-environment support
# --------------------------------------------------
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        python3 \
        python3-pip \
        python3-venv \
        build-essential && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# --------------------------------------------------
# Python environment
# --------------------------------------------------
RUN python3 -m venv /opt/venv

ENV PATH="/opt/venv/bin:$PATH"

COPY requirements.txt ./

RUN pip install --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# --------------------------------------------------
# Node dependencies
# --------------------------------------------------
COPY package*.json ./

RUN npm ci --omit=dev

# --------------------------------------------------
# Application
# --------------------------------------------------
COPY . .

# Use the Python environment containing
# Qiskit, Aer, Cirq, PennyLane and Papermill.
ENV PYTHON_PATH=/opt/venv/bin/python

ENV NODE_ENV=production

EXPOSE 10000

CMD ["node", "server.js"]