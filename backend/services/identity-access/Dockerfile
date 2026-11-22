# Multi-stage Dockerfile for identity-access service
# Stage 1: Build & Package
FROM eclipse-temurin:25-jdk AS builder

WORKDIR /workspace

# Copy Gradle wrapper and configuration for layer caching
COPY gradle/ gradle/
COPY gradlew settings.gradle.kts build.gradle.kts ./
RUN chmod +x gradlew

# Copy source code and build executable Spring Boot JAR with tests
COPY src/ src/
RUN ./gradlew bootJar --no-daemon

# Stage 2: Minimal Runtime
FROM eclipse-temurin:25-jre AS runner

WORKDIR /app

# Create unprivileged system user & group
RUN groupadd -r appgroup -g 1001 && \
    useradd -r -u 1001 -g appgroup -m -d /app appuser

# Copy executable JAR from builder
COPY --from=builder --chown=appuser:appgroup /workspace/build/libs/*.jar /app/app.jar

USER appuser

EXPOSE 8096

# Configure container-aware JVM settings and support exec form for graceful SIGTERM
ENV JAVA_OPTS="-XX:MaxRAMPercentage=75.0 -XX:+UseContainerSupport -Djava.security.egd=file:/dev/./urandom"

ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -jar /app/app.jar"]
