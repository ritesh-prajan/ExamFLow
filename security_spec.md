# Security Specification - ExamFlow

## Data Invariants
1. A **User** profile must match the authenticated user's ID and contain verified identity information.
2. A **Subject** must belong to a valid User and have a future or valid exam date.
3. A **Topic** must belong to a valid Subject and the same User who owns the subject.
4. **Timestamps** (`createdAt`, `updatedAt`) must be managed via server time or validated ISO strings. (Following app pattern, but rules will enforce stricter server-side checks where possible).

## The "Dirty Dozen" Payloads (Attack Vectors)
1. **Identity Spoofing**: Attempt to create a subject with `userId` of another user.
2. **Path Poisoning**: Attempt to use a 2MB string as a `subjectId` to cause resource exhaustion.
3. **Shadow Update**: Attempt to inject `isAdmin: true` into a user profile.
4. **Status Shortcut**: Move a topic from "Not Started" to "Mastered" while setting `mastery` to 0.
5. **Orphaned Topic**: Create a topic with a `subjectId` that doesn't exist.
6. **Immutability Breach**: Attempt to change the `userId` of an existing subject.
7. **Size Bomb**: Send a 1MB string for a topic `name`.
8. **Unverified Write**: Attempt to update a study plan with an unverified email (if email verification is expected).
9. **Relational Leak**: Attempt to list topics for a subject the user doesn't own.
10. **Attribute Injection**: Adding `feedbackGenerated: true` (system field) to a subject.
11. **ID Poisoning**: Using `../../auth/users` as a document ID.
12. **PII Leak**: Authenticated user trying to read another user's email via a list query.

## The Test Runner (Plan)
We will verify that:
- `create` and `update` fail if required fields are missing.
- `create` and `update` fail if types are incorrect.
- `update` fails if immutable fields like `userId` are modified.
- `write` fails if the user is not authenticated or not the owner.
- `write` fails if `isValidId` fails.
- `update` fails if the "Dirty Dozen" payloads are sent.
