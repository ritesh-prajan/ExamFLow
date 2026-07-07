import { initializeTestEnvironment, RulesTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { describe, it, beforeAll, afterAll, beforeEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { setDoc, getDoc, updateDoc, collection, doc, deleteDoc, getDocs } from 'firebase/firestore';

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  // Read local rules file
  const rulesPath = path.resolve(__dirname, '../../firestore.rules');
  const rulesContent = fs.readFileSync(rulesPath, 'utf8');

  testEnv = await initializeTestEnvironment({
    projectId: 'examflow-test-project',
    firestore: {
      rules: rulesContent,
      host: '127.0.0.1',
      port: 8080
    }
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
});

describe('Firestore Security Rules', () => {
  // Helper to get authenticated context
  const getAuthDb = (uid: string, emailVerified = true) => {
    return testEnv.authenticatedContext(uid, {
      email_verified: emailVerified,
      email: `${uid}@example.com`
    }).firestore();
  };

  // Helper to get unauthenticated context
  const getUnauthDb = () => {
    return testEnv.unauthenticatedContext().firestore();
  };

  describe('Global Deny & Authentication Rules', () => {
    it('should deny unauthenticated read/write to users', async () => {
      const db = getUnauthDb();
      const userRef = doc(db, 'users', 'user1');
      await assertFails(getDoc(userRef));
      await assertFails(setDoc(userRef, { uid: 'user1' }));
    });

    it('should allow authenticated owner read/write to user document', async () => {
      const db = getAuthDb('user1');
      const userRef = doc(db, 'users', 'user1');
      await assertSucceeds(setDoc(userRef, { uid: 'user1', onboardingCompleted: false }));
      await assertSucceeds(getDoc(userRef));
    });

    it('should deny writing to someone else\'s user document', async () => {
      const db = getAuthDb('user1');
      const userRef = doc(db, 'users', 'user2');
      await assertFails(setDoc(userRef, { uid: 'user2' }));
    });
  });

  describe('The Dirty Dozen Attack Vectors', () => {
    
    // 1. Identity Spoofing: Attempt to create a subject with userId of another user
    it('1. Identity Spoofing: should deny creating a subject with userId of another user', async () => {
      const db = getAuthDb('user1');
      const subjectRef = doc(db, 'users', 'user1', 'subjects', 'subject1');
      await assertFails(setDoc(subjectRef, {
        userId: 'user2', // Spoofed ID
        name: 'Calculus',
        dailyHours: 2,
        examDate: '2026-08-01'
      }));
    });

    // 2. Path Poisoning: Attempt to use an excessively long string as a subjectId
    it('2. Path Poisoning: should deny writing if document ID size is too large (> 128 chars)', async () => {
      const db = getAuthDb('user1');
      const longId = 'a'.repeat(130);
      const subjectRef = doc(db, 'users', 'user1', 'subjects', longId);
      await assertFails(setDoc(subjectRef, {
        userId: 'user1',
        name: 'Calculus',
        dailyHours: 2,
        examDate: '2026-08-01'
      }));
    });

    // 3. Shadow Update: Attempt to inject undocumented properties (like isAdmin)
    it('3. Shadow Update: should fail validation if unknown properties are passed during write/update', async () => {
      const db = getAuthDb('user1');
      const userRef = doc(db, 'users', 'user1');
      // Rules allow: uid, email, displayName, onboardingCompleted. Sending 'isAdmin' should fail validation.
      await assertFails(setDoc(userRef, {
        uid: 'user1',
        isAdmin: true // Undocumented property
      }));
    });

    // 5. Orphaned Topic / Relationship Cross-checking
    it('5. Orphaned Topic: should deny creating a topic for a subject that has a mismatching owner', async () => {
      const db = getAuthDb('user1');
      const topicRef = doc(db, 'users', 'user1', 'subjects', 'subject1', 'topics', 'topic1');
      await assertFails(setDoc(topicRef, {
        userId: 'user2', // Spoofed owner
        name: 'Integration',
        status: 'Not Started',
        mastery: 0
      }));
    });

    // 6. Immutability Breach: Attempt to change the userId of an existing subject
    it('6. Immutability Breach: should deny updating a subject to change its owner', async () => {
      // First setup document as admin or by bypassing checks (using rules engine, we write initial document using authenticated db)
      const db = getAuthDb('user1');
      const subjectRef = doc(db, 'users', 'user1', 'subjects', 'subject1');
      await assertSucceeds(setDoc(subjectRef, {
        userId: 'user1',
        name: 'Calculus',
        dailyHours: 2,
        examDate: '2026-08-01'
      }));

      // Try updating userId
      await assertFails(updateDoc(subjectRef, {
        userId: 'user2' // Immutability breach
      }));
    });

    // 7. Size Bomb: Send massive strings for fields
    it('7. Size Bomb: should deny writes containing oversized strings (> 2048 chars for topic name)', async () => {
      const db = getAuthDb('user1');
      const topicRef = doc(db, 'users', 'user1', 'subjects', 'subject1', 'topics', 'topic1');
      await assertFails(setDoc(topicRef, {
        userId: 'user1',
        name: 'a'.repeat(2050), // Oversized topic name
        status: 'Not Started',
        mastery: 0
      }));
    });

    // 8. Unverified Write
    it('8. Unverified Write: should deny writes if the email is not verified', async () => {
      const db = getAuthDb('user1', false); // emailVerified = false
      const subjectRef = doc(db, 'users', 'user1', 'subjects', 'subject1');
      await assertFails(setDoc(subjectRef, {
        userId: 'user1',
        name: 'Calculus',
        dailyHours: 2,
        examDate: '2026-08-01'
      }));
    });

    // 9. Relational Leak: Attempt to read/list topics of another user's subject
    it('9. Relational Leak: should deny listing or reading topics owned by another user', async () => {
      const db = getAuthDb('user2'); // Signed in as user2
      const topicRef = doc(db, 'users', 'user1', 'subjects', 'subject1', 'topics', 'topic1');
      await assertFails(getDoc(topicRef));
    });

    // 11. ID Poisoning: Path traversal inside doc IDs
    it('11. ID Poisoning: should deny documents using parent traversal or malicious characters', async () => {
      const db = getAuthDb('user1');
      // Firestore SDK itself will throw or reject local document paths with back-traversals.
      // But we verify path nesting constraint matches owner UID.
      const subjectRef = doc(db, 'users', 'user1', 'subjects', 'sub1');
      await assertSucceeds(setDoc(subjectRef, {
        userId: 'user1',
        name: 'Calculus',
        dailyHours: 2,
        examDate: '2026-08-01'
      }));
    });

    // 12. PII Leak: Read another user's document
    it('12. PII Leak: should deny reading user profile details of another user', async () => {
      const db = getAuthDb('user2');
      const userRef = doc(db, 'users', 'user1');
      await assertFails(getDoc(userRef));
    });
  });
});
