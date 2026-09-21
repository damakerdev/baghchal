# Step 1: Build Stage
FROM gcc:latest AS builder

# Install required build tools and ASIO (Crow dependency)
RUN apt-get update && apt-get install -y \
    cmake \
    libasio-dev \
    git \
    && rm -rf /var/lib/apt/lists/*

# Download Crow header-only library directly
RUN git clone https://github.com/CrowCpp/Crow.git /tmp/crow && \
    cp -r /tmp/crow/include/* /usr/local/include/

WORKDIR /app

# Copy project files
COPY . .

# Compile with Crow, ASIO, and threading support linked
RUN g++ -O2 src/*.cpp -o baghchal_game -pthread -I/usr/local/include

# Step 2: Runtime Stage (Use gcc:latest so GLIBC matches builder exactly)
FROM gcc:latest

WORKDIR /app

# Copy compiled binary from builder
COPY --from=builder /app/baghchal_game /app/baghchal_game

# Expose Crow's web port (adjust if your main.cpp uses 8080 or another port)
EXPOSE 18080

CMD ["./baghchal_game"]