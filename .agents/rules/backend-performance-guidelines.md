---
description: Backend performance, database efficiency, scalability, and concurrency guidelines for all backend services.
alwaysApply: true
---

# Backend Performance and Concurrency Guidelines

All backend services must be implemented with performance, scalability, and concurrency in mind, without compromising correctness, security, or maintainability.

## 1. Database Efficiency
- Minimize database round trips. Avoid unnecessary sequential queries when operations can be combined.
- Use atomic database operations where possible, such as conditional updates, upserts, and bulk operations.
- Select only the fields required using Prisma `select` rather than retrieving entire records unnecessarily.
- Avoid N+1 query problems. Use appropriate `include`, batching, or bulk queries.
- Ensure frequently queried and filtered fields have appropriate database indexes.
- Avoid unnecessary database writes, especially when values have not changed.

## 2. Concurrency and Asynchronous Operations
- Execute independent asynchronous operations concurrently using `Promise.all()` or appropriate concurrency controls.
- Use database transactions when multiple operations must succeed or fail together.
- Prevent race conditions using atomic updates, unique constraints, optimistic locking, or appropriate transaction isolation.
- Ensure endpoints are safe under simultaneous requests and retries.
- Avoid unbounded concurrency for large batches; use controlled concurrency or background jobs when necessary.

## 3. API and Service Design
- Keep service methods efficient, focused, and free of unnecessary processing.
- Validate inputs before expensive operations.
- Implement pagination for potentially large result sets.
- Use caching for frequently accessed, relatively stable data when it provides measurable benefits.
- Move long-running or non-critical work to background queues where appropriate.
- Avoid blocking the event loop with CPU-intensive tasks.

## 4. Reliability and Security
- Enforce authorization within database operations where practical, rather than relying solely on separate pre-checks.
- Handle errors and partial failures explicitly.
- Ensure retries do not cause duplicate side effects; use idempotency where appropriate.
- Never sacrifice data integrity or authorization for performance.

## 5. Testing and Performance Validation
- Test concurrent requests and race conditions for critical operations.
- Identify and address slow queries using query logs and execution plans.
- Add performance tests for high-traffic endpoints and large data operations.
- Review query count, latency, memory usage, and database load before optimizing.

## Acceptance Criteria
Every backend feature should:
- Avoid unnecessary database queries and sequential awaits.
- Use atomic operations or transactions where appropriate.
- Remain correct under concurrent requests.
- Have appropriate indexes and pagination.
- Be tested for correctness, security, and relevant performance risks.

Engineers should document any intentional deviation from these guidelines and explain the trade-offs.

