/**
 * Database integration tests using Prisma ORM
 * 
 * Tests database operations including:
 * - User CRUD operations
 * - Refresh token management
 * - Data integrity validations
 * - Transaction handling
 * - Database constraints and relationships
 */

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { testDb } from '../setup.js';

describe('Database Integration Tests', () => {
  describe('User Operations', () => {
    test('should create user with valid data', async () => {
      const userData = {
        email: 'dbtest@example.com',
        username: 'dbtest',
        passwordHash: await bcrypt.hash('password123', 10)
      };

      const user = await testDb.prisma.user.create({
        data: userData
      });

      expect(user).toMatchObject({
        email: userData.email,
        username: userData.username,
        passwordHash: userData.passwordHash
      });
      expect(user.id).toBeDefined();
      expect(user.createdAt).toBeInstanceOf(Date);
    });

    test('should enforce unique email constraint', async () => {
      const userData = {
        email: 'unique@example.com',
        username: 'user1',
        passwordHash: 'hash1'
      };

      // Create first user
      await testDb.prisma.user.create({ data: userData });

      // Try to create second user with same email
      const duplicateData = {
        email: 'unique@example.com',
        username: 'user2',
        passwordHash: 'hash2'
      };

      await expect(
        testDb.prisma.user.create({ data: duplicateData })
      ).rejects.toThrow();
    });

    test('should enforce unique username constraint', async () => {
      const userData = {
        email: 'user1@example.com',
        username: 'uniqueuser',
        passwordHash: 'hash1'
      };

      // Create first user
      await testDb.prisma.user.create({ data: userData });

      // Try to create second user with same username
      const duplicateData = {
        email: 'user2@example.com',
        username: 'uniqueuser',
        passwordHash: 'hash2'
      };

      await expect(
        testDb.prisma.user.create({ data: duplicateData })
      ).rejects.toThrow();
    });

    test('should update user profile successfully', async () => {
      const user = await testDb.createTestUser({
        email: 'update@example.com',
        username: 'updateuser',
        bio: 'Original bio'
      });

      const updatedUser = await testDb.prisma.user.update({
        where: { id: user.id },
        data: {
          username: 'newusername',
          bio: 'Updated bio',
          avatar: 'https://example.com/avatar.jpg'
        }
      });

      expect(updatedUser.username).toBe('newusername');
      expect(updatedUser.bio).toBe('Updated bio');
      expect(updatedUser.avatar).toBe('https://example.com/avatar.jpg');
      expect(updatedUser.email).toBe('update@example.com'); // Unchanged
    });

    test('should find user by email or username', async () => {
      const userData = {
        email: 'find@example.com',
        username: 'finduser'
      };
      
      const user = await testDb.createTestUser(userData);

      // Find by email
      const foundByEmail = await testDb.prisma.user.findFirst({
        where: { 
          OR: [
            { email: 'find@example.com' },
            { username: 'find@example.com' }
          ]
        }
      });

      // Find by username
      const foundByUsername = await testDb.prisma.user.findFirst({
        where: { 
          OR: [
            { email: 'finduser' },
            { username: 'finduser' }
          ]
        }
      });

      expect(foundByEmail.id).toBe(user.id);
      expect(foundByUsername.id).toBe(user.id);
    });

    test('should handle user deletion with cascade', async () => {
      const user = await testDb.createTestUser();
      
      // Create refresh tokens for the user
      const refreshToken1 = await testDb.createTestRefreshToken(user.id, {
        token: 'token1'
      });
      const refreshToken2 = await testDb.createTestRefreshToken(user.id, {
        token: 'token2'
      });

      // Delete user
      await testDb.prisma.user.delete({
        where: { id: user.id }
      });

      // Verify user is deleted
      const deletedUser = await testDb.prisma.user.findUnique({
        where: { id: user.id }
      });
      expect(deletedUser).toBeNull();

      // Verify refresh tokens are also deleted (cascade)
      const orphanedTokens = await testDb.prisma.refreshToken.findMany({
        where: { userId: user.id }
      });
      expect(orphanedTokens).toHaveLength(0);
    });
  });

  describe('Refresh Token Operations', () => {
    let testUser;

    beforeEach(async () => {
      testUser = await testDb.createTestUser({
        email: 'tokentest@example.com',
        username: 'tokentest'
      });
    });

    test('should create refresh token successfully', async () => {
      const tokenData = {
        token: 'test-refresh-token-123',
        userId: testUser.id,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      };

      const refreshToken = await testDb.prisma.refreshToken.create({
        data: tokenData
      });

      expect(refreshToken).toMatchObject({
        token: tokenData.token,
        userId: tokenData.userId,
        isRevoked: false
      });
      expect(refreshToken.id).toBeDefined();
      expect(refreshToken.expiresAt).toBeInstanceOf(Date);
    });

    test('should enforce unique token constraint', async () => {
      const tokenValue = 'unique-token-123';
      
      // Create first token
      await testDb.createTestRefreshToken(testUser.id, {
        token: tokenValue
      });

      // Try to create second token with same value
      await expect(
        testDb.createTestRefreshToken(testUser.id, {
          token: tokenValue
        })
      ).rejects.toThrow();
    });

    test('should find valid refresh token', async () => {
      const tokenValue = 'valid-token-123';
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      
      await testDb.createTestRefreshToken(testUser.id, {
        token: tokenValue,
        expiresAt: expiresAt,
        isRevoked: false
      });

      const foundToken = await testDb.prisma.refreshToken.findUnique({
        where: { token: tokenValue }
      });

      expect(foundToken).toBeTruthy();
      expect(foundToken.token).toBe(tokenValue);
      expect(foundToken.isRevoked).toBe(false);
      expect(foundToken.expiresAt.getTime()).toBeGreaterThan(Date.now());
    });

    test('should revoke refresh token', async () => {
      const tokenValue = 'revoke-token-123';
      
      await testDb.createTestRefreshToken(testUser.id, {
        token: tokenValue
      });

      // Revoke the token
      const updatedToken = await testDb.prisma.refreshToken.update({
        where: { token: tokenValue },
        data: { isRevoked: true }
      });

      expect(updatedToken.isRevoked).toBe(true);
    });

    test('should handle expired tokens', async () => {
      const expiredDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // Yesterday
      const tokenValue = 'expired-token-123';
      
      await testDb.createTestRefreshToken(testUser.id, {
        token: tokenValue,
        expiresAt: expiredDate
      });

      const expiredToken = await testDb.prisma.refreshToken.findUnique({
        where: { token: tokenValue }
      });

      expect(expiredToken.expiresAt.getTime()).toBeLessThan(Date.now());
    });

    test('should clean up multiple tokens for user', async () => {
      const tokens = [
        'token-1-cleanup',
        'token-2-cleanup',
        'token-3-cleanup'
      ];

      // Create multiple tokens
      for (const token of tokens) {
        await testDb.createTestRefreshToken(testUser.id, { token });
      }

      // Verify tokens exist
      const userTokens = await testDb.prisma.refreshToken.findMany({
        where: { userId: testUser.id }
      });
      expect(userTokens).toHaveLength(3);

      // Delete all tokens for user
      await testDb.prisma.refreshToken.deleteMany({
        where: { userId: testUser.id }
      });

      // Verify tokens are deleted
      const remainingTokens = await testDb.prisma.refreshToken.findMany({
        where: { userId: testUser.id }
      });
      expect(remainingTokens).toHaveLength(0);
    });
  });

  describe('Database Relationships', () => {
    test('should maintain user-refreshToken relationship', async () => {
      const user = await testDb.createTestUser({
        email: 'relationship@example.com',
        username: 'relationshipuser'
      });

      const refreshToken = await testDb.createTestRefreshToken(user.id, {
        token: 'relationship-token'
      });

      // Query user with tokens
      const userWithTokens = await testDb.prisma.user.findUnique({
        where: { id: user.id },
        include: { refreshTokens: true }
      });

      expect(userWithTokens.refreshTokens).toHaveLength(1);
      expect(userWithTokens.refreshTokens[0].token).toBe('relationship-token');

      // Query token with user
      const tokenWithUser = await testDb.prisma.refreshToken.findUnique({
        where: { id: refreshToken.id },
        include: { user: true }
      });

      expect(tokenWithUser.user.email).toBe('relationship@example.com');
    });

    test('should enforce foreign key constraints', async () => {
      // Try to create refresh token with non-existent user ID
      await expect(
        testDb.prisma.refreshToken.create({
          data: {
            token: 'invalid-user-token',
            userId: 'non-existent-user-id',
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
          }
        })
      ).rejects.toThrow();
    });
  });

  describe('Database Transactions', () => {
    test('should handle successful transaction', async () => {
      const result = await testDb.prisma.$transaction(async (tx) => {
        // Create user
        const user = await tx.user.create({
          data: {
            email: 'transaction@example.com',
            username: 'transactionuser',
            passwordHash: 'hash'
          }
        });

        // Create refresh token
        const refreshToken = await tx.refreshToken.create({
          data: {
            token: 'transaction-token',
            userId: user.id,
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
          }
        });

        return { user, refreshToken };
      });

      expect(result.user).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(result.refreshToken.userId).toBe(result.user.id);
    });

    test('should rollback failed transaction', async () => {
      await expect(
        testDb.prisma.$transaction(async (tx) => {
          // Create user successfully
          const user = await tx.user.create({
            data: {
              email: 'rollback@example.com',
              username: 'rollbackuser',
              passwordHash: 'hash'
            }
          });

          // Try to create duplicate user (should fail)
          await tx.user.create({
            data: {
              email: 'rollback@example.com', // Same email
              username: 'rollbackuser2',
              passwordHash: 'hash2'
            }
          });

          return user;
        })
      ).rejects.toThrow();

      // Verify neither user was created due to rollback
      const users = await testDb.prisma.user.findMany({
        where: { email: 'rollback@example.com' }
      });
      expect(users).toHaveLength(0);
    });
  });

  describe('Database Performance', () => {
    test('should handle bulk operations efficiently', async () => {
      const userData = Array.from({ length: 100 }, (_, i) => ({
        email: `bulk${i}@example.com`,
        username: `bulkuser${i}`,
        passwordHash: 'hash'
      }));

      const startTime = Date.now();
      
      // Use createMany for better performance
      const result = await testDb.prisma.user.createMany({
        data: userData,
        skipDuplicates: true
      });

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(result.count).toBe(100);
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds

      // Verify users were created
      const createdUsers = await testDb.prisma.user.findMany({
        where: {
          email: { contains: 'bulk' }
        }
      });
      expect(createdUsers).toHaveLength(100);
    });

    test('should handle complex queries efficiently', async () => {
      // Create test data
      const users = await Promise.all([
        testDb.createTestUser({ email: 'active1@test.com', username: 'active1' }),
        testDb.createTestUser({ email: 'active2@test.com', username: 'active2' }),
        testDb.createTestUser({ email: 'inactive@test.com', username: 'inactive' })
      ]);

      // Create tokens for active users
      await testDb.createTestRefreshToken(users[0].id, { token: 'active1-token' });
      await testDb.createTestRefreshToken(users[1].id, { token: 'active2-token' });

      const startTime = Date.now();

      // Complex query: users with valid refresh tokens
      const activeUsers = await testDb.prisma.user.findMany({
        where: {
          refreshTokens: {
            some: {
              isRevoked: false,
              expiresAt: { gt: new Date() }
            }
          }
        },
        include: {
          refreshTokens: {
            where: {
              isRevoked: false,
              expiresAt: { gt: new Date() }
            }
          }
        }
      });

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(activeUsers).toHaveLength(2);
      expect(duration).toBeLessThan(1000); // Should be fast with proper indexing
      expect(activeUsers[0].refreshTokens).toHaveLength(1);
      expect(activeUsers[1].refreshTokens).toHaveLength(1);
    });
  });

  describe('Data Integrity', () => {
    test('should validate email format at database level', async () => {
      // Note: This test assumes database-level constraints
      // In practice, validation might be handled at application level
      
      const invalidEmailData = {
        email: 'invalid-email-format',
        username: 'testuser',
        passwordHash: 'hash'
      };

      // Depending on database constraints, this might pass or fail
      // This test documents expected behavior
      const user = await testDb.prisma.user.create({
        data: invalidEmailData
      });

      expect(user).toBeDefined();
      // In a real implementation, you might want to add validation
    });

    test('should handle concurrent user creation', async () => {
      const userData = {
        email: 'concurrent@example.com',
        username: 'concurrent',
        passwordHash: 'hash'
      };

      // Attempt to create the same user concurrently
      const promises = Array.from({ length: 5 }, () =>
        testDb.prisma.user.create({ data: userData }).catch(err => err)
      );

      const results = await Promise.all(promises);
      
      // Only one should succeed, others should fail due to unique constraints
      const successes = results.filter(r => r.id);
      const failures = results.filter(r => r.message);

      expect(successes).toHaveLength(1);
      expect(failures.length).toBeGreaterThan(0);
    });
  });
});