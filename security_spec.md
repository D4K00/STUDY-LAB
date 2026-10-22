# Study Lab Security Specification

## Data Invariants
1. A Course, Lecture, TutorConversation, FlashcardDeck, Flashcard, Quiz, QuizAttempt, or PlannerEvent can only be read, created, updated, or deleted by its authenticated owner (`userId == request.auth.uid`).
2. Documents cannot be created without matching the caller's authenticated UID.
3. Immutability: An owner cannot reassign document ownership (`incoming().userId == existing().userId`).
4. Timestamps and IDs must be validated to prevent denial of wallet and resource poisoning.
5. Study groups: Group creation requires the caller to be the `ownerId`. Group members can read group data. Only group owners or members themselves can manage group memberships.
6. User profiles: A user can only read and write their own profile document (`users/{userId}` where `userId == request.auth.uid`).

## The Dirty Dozen Payloads (All MUST return PERMISSION_DENIED)
1. Unauthenticated read on `/courses/{courseId}`.
2. Unauthenticated write on `/courses/{courseId}`.
3. Authenticated user A attempting to read `/courses/{courseId}` owned by user B.
4. Authenticated user A attempting to update `/lectures/{lectureId}` owned by user B.
5. Authenticated user A attempting to delete `/flashcards/{cardId}` owned by user B.
6. Identity spoofing: Authenticated user A attempting to create `/courses/c1` with `userId: "userB"`.
7. Ownership reassignment: User A attempting to update `/courses/c1` by changing `userId` to `userB`.
8. Path traversal / ID poisoning: Using an ID with junk characters > 128 chars.
9. Ghost Field injection / Shadow update: Attempting to update a course with unauthorized fields.
10. Unauthenticated read on `/users/{userId}`.
11. Authenticated user A attempting to read `/users/{userB}`.
12. Authenticated user A attempting to modify study group `/study_groups/{groupId}` owned by user B without membership/ownership.
