FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y gcc libpq-dev && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

ENV DATABASE_URL=sqlite:///./water_crisis.db
ENV DEBUG=False
ENV JWT_SECRET_KEY=water-crisis-secret-key-production-2024

EXPOSE 10000

CMD ["sh", "/app/start.sh"]