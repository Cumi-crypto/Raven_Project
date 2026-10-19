# Build stage
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app
COPY pom.xml .
COPY src ./src
RUN mvn clean package -DskipTests

# Download SQLite JDBC explicitly because *.jar is in .gitignore
RUN wget -q https://repo1.maven.org/maven2/org/xerial/sqlite-jdbc/3.41.2.1/sqlite-jdbc-3.41.2.1.jar -O sqlite-jdbc-3.41.2.1.jar

# Run stage
FROM eclipse-temurin:21-jre
WORKDIR /app

# Copy the compiled classes and the downloaded jar
COPY --from=build /app/target/classes ./target/classes
COPY --from=build /app/sqlite-jdbc-3.41.2.1.jar .

# Copy necessary database and text files needed by the application
COPY kamus.db .
COPY ind.txt .
COPY Kamus.txt .

# Use a wildcard copy for config.properties so it doesn't fail if the file is missing from github
COPY config.propertie[s] .

# The application reads the PORT environment variable now
EXPOSE 8091

# Run the Java API
CMD ["java", "-cp", "target/classes:sqlite-jdbc-3.41.2.1.jar", "App.SimpleAPI"]
