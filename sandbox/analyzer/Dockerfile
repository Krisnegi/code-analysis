FROM node:20-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    golang-go \
    jq \
    procps \
    cloc \
    grep \
    findutils \
    curl \
    ca-certificates \
    wget \
    && rm -rf /var/lib/apt/lists/*

RUN npm install -g eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin eslint-plugin-react mocha jest vitest ava --omit=dev

RUN ARCH=$(uname -m) && \
    if [ "$ARCH" = "aarch64" ] || [ "$ARCH" = "arm64" ]; then \
      GITLEAKS_ARCH="arm64"; \
    else \
      GITLEAKS_ARCH="x64"; \
    fi && \
    curl -sSL "https://github.com/gitleaks/gitleaks/releases/download/v8.18.2/gitleaks_8.18.2_linux_${GITLEAKS_ARCH}.tar.gz" | tar -xz -C /usr/local/bin gitleaks

RUN pip3 install --no-cache-dir pylint pip-audit pytest --break-system-packages || pip3 install --no-cache-dir pylint pip-audit pytest

COPY scripts/ /scripts/
RUN chmod +x /scripts/*.sh

WORKDIR /workspace
