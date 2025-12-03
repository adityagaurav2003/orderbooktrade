Limit Order Book Trading Engine ⚡

A production-style backend system implementing a real limit order book, secure payment webhooks, full automated testing, Docker support, and continuous integration with GitHub Actions.

Features 🚀
Limit Order Book Engine

Handles bid/ask placement, price–time priority, partial fills, quote generation, and real balance settlement—similar to how actual exchanges match orders.

Secure Payment Webhook 🔐

Simulated payment processor webhook with HMAC signature verification, timestamp validation, idempotency protection, and automatic USD balance crediting.

Automated Testing 🧪

Jest + Supertest suite covering order matching logic, quote accuracy, balance updates, and webhook signature behavior.

Dockerized Application 🐳

Runs in a reproducible container environment for consistent development and deployment.

Continuous Integration ⚙️

GitHub Actions pipeline automatically installs dependencies, runs tests, and builds the Docker image on every push to the main branch.

What This Project Demonstrates 💡

• Understanding of real-world trading engine mechanics
• Secure webhook design patterns
• Backend testing discipline
• Containerization and deploy-ready workflows
• Practical CI implementation

Summary 📌

This project models the core behavior of a working trading backend—order matching, settlement, and pricing—while integrating security, automation, and deployment practices expected in modern backend engineering.
