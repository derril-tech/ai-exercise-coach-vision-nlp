import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

interface EncryptionEnvelope {
  encryptedData: string;
  encryptedKey: string;
  keyId: string;
  algorithm: string;
  iv: string;
  authTag: string;
  userId: string;
  createdAt: Date;
}

interface DecryptionResult {
  data: string;
  metadata: {
    keyId: string;
    algorithm: string;
    userId: string;
    createdAt: Date;
  };
}

@Injectable()
export class KMSService {
  private readonly logger = new Logger(KMSService.name);
  private readonly masterKeys: Map<string, Buffer> = new Map();
  private readonly algorithm = 'aes-256-gcm';
  private readonly keyLength = 32; // 256 bits

  constructor(private configService: ConfigService) {
    this.initializeMasterKeys();
  }

  private initializeMasterKeys() {
    // In production, these would be fetched from AWS KMS, Azure Key Vault, etc.
    // For demo purposes, we'll use environment variables or generate keys
    const masterKeyHex = this.configService.get<string>('KMS_MASTER_KEY') || 
                        crypto.randomBytes(32).toString('hex');
    
    this.masterKeys.set('default', Buffer.from(masterKeyHex, 'hex'));
    this.logger.log('KMS Service initialized with master keys');
  }

  /**
   * Encrypt data using envelope encryption pattern
   * 1. Generate a random data encryption key (DEK)
   * 2. Encrypt the actual data with the DEK
   * 3. Encrypt the DEK with the master key (KEK)
   * 4. Return both encrypted data and encrypted DEK
   */
  async encryptWithEnvelope(
    data: string, 
    userId: string, 
    keyId: string = 'default'
  ): Promise<EncryptionEnvelope> {
    try {
      // Step 1: Generate a random data encryption key (DEK)
      const dek = crypto.randomBytes(this.keyLength);
      
      // Step 2: Encrypt the data with the DEK
      const iv = crypto.randomBytes(16); // 128-bit IV for AES-GCM
      const cipher = crypto.createCipher(this.algorithm, dek);
      cipher.setAAD(Buffer.from(userId)); // Additional authenticated data
      
      let encryptedData = cipher.update(data, 'utf8', 'base64');
      encryptedData += cipher.final('base64');
      const authTag = cipher.getAuthTag();

      // Step 3: Encrypt the DEK with the master key
      const masterKey = this.masterKeys.get(keyId);
      if (!masterKey) {
        throw new Error(`Master key not found for keyId: ${keyId}`);
      }

      const encryptedKey = this.encryptDEK(dek, masterKey, userId);

      // Step 4: Create the envelope
      const envelope: EncryptionEnvelope = {
        encryptedData,
        encryptedKey: encryptedKey.toString('base64'),
        keyId,
        algorithm: this.algorithm,
        iv: iv.toString('base64'),
        authTag: authTag.toString('base64'),
        userId,
        createdAt: new Date()
      };

      this.logger.debug(`Data encrypted for user ${userId} with key ${keyId}`);
      return envelope;

    } catch (error) {
      this.logger.error(`Encryption failed for user ${userId}:`, error);
      throw new Error('Encryption failed');
    }
  }

  /**
   * Decrypt data from envelope encryption
   */
  async decryptFromEnvelope(envelope: EncryptionEnvelope): Promise<DecryptionResult> {
    try {
      // Step 1: Get the master key
      const masterKey = this.masterKeys.get(envelope.keyId);
      if (!masterKey) {
        throw new Error(`Master key not found for keyId: ${envelope.keyId}`);
      }

      // Step 2: Decrypt the DEK
      const encryptedKeyBuffer = Buffer.from(envelope.encryptedKey, 'base64');
      const dek = this.decryptDEK(encryptedKeyBuffer, masterKey, envelope.userId);

      // Step 3: Decrypt the data with the DEK
      const decipher = crypto.createDecipher(envelope.algorithm, dek);
      decipher.setAAD(Buffer.from(envelope.userId));
      decipher.setAuthTag(Buffer.from(envelope.authTag, 'base64'));

      let decryptedData = decipher.update(envelope.encryptedData, 'base64', 'utf8');
      decryptedData += decipher.final('utf8');

      this.logger.debug(`Data decrypted for user ${envelope.userId}`);

      return {
        data: decryptedData,
        metadata: {
          keyId: envelope.keyId,
          algorithm: envelope.algorithm,
          userId: envelope.userId,
          createdAt: envelope.createdAt
        }
      };

    } catch (error) {
      this.logger.error(`Decryption failed for user ${envelope.userId}:`, error);
      throw new Error('Decryption failed');
    }
  }

  /**
   * Encrypt the Data Encryption Key (DEK) with the Key Encryption Key (KEK/Master Key)
   */
  private encryptDEK(dek: Buffer, masterKey: Buffer, userId: string): Buffer {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher('aes-256-gcm', masterKey);
    cipher.setAAD(Buffer.from(userId));

    const encrypted = Buffer.concat([
      cipher.update(dek),
      cipher.final()
    ]);

    const authTag = cipher.getAuthTag();
    
    // Combine IV + encrypted DEK + auth tag
    return Buffer.concat([iv, encrypted, authTag]);
  }

  /**
   * Decrypt the Data Encryption Key (DEK) with the Key Encryption Key (KEK/Master Key)
   */
  private decryptDEK(encryptedDEK: Buffer, masterKey: Buffer, userId: string): Buffer {
    const iv = encryptedDEK.subarray(0, 16);
    const authTag = encryptedDEK.subarray(-16);
    const encrypted = encryptedDEK.subarray(16, -16);

    const decipher = crypto.createDecipher('aes-256-gcm', masterKey);
    decipher.setAAD(Buffer.from(userId));
    decipher.setAuthTag(authTag);

    return Buffer.concat([
      decipher.update(encrypted),
      decipher.final()
    ]);
  }

  /**
   * Generate a new user-specific encryption key
   */
  async generateUserKey(userId: string): Promise<string> {
    const userKey = crypto.randomBytes(32);
    const keyId = `user-${userId}-${Date.now()}`;
    
    // In production, this would be stored in KMS
    this.masterKeys.set(keyId, userKey);
    
    this.logger.log(`Generated new key for user ${userId}: ${keyId}`);
    return keyId;
  }

  /**
   * Rotate encryption keys (for security best practices)
   */
  async rotateUserKey(userId: string, oldKeyId: string): Promise<string> {
    const newKeyId = await this.generateUserKey(userId);
    
    // In production, you would:
    // 1. Re-encrypt all data with the new key
    // 2. Securely delete the old key
    // 3. Update all references to use the new key
    
    this.logger.log(`Rotated key for user ${userId}: ${oldKeyId} -> ${newKeyId}`);
    return newKeyId;
  }

  /**
   * Encrypt sensitive user data (PII, health data, etc.)
   */
  async encryptUserData(data: any, userId: string): Promise<string> {
    const jsonData = JSON.stringify(data);
    const envelope = await this.encryptWithEnvelope(jsonData, userId);
    return JSON.stringify(envelope);
  }

  /**
   * Decrypt sensitive user data
   */
  async decryptUserData(encryptedData: string, userId: string): Promise<any> {
    const envelope: EncryptionEnvelope = JSON.parse(encryptedData);
    
    // Verify the data belongs to the requesting user
    if (envelope.userId !== userId) {
      throw new Error('Unauthorized access to encrypted data');
    }

    const result = await this.decryptFromEnvelope(envelope);
    return JSON.parse(result.data);
  }

  /**
   * Encrypt workout session data
   */
  async encryptSessionData(sessionData: any, userId: string): Promise<string> {
    // Remove or hash any PII before encryption
    const sanitizedData = this.sanitizeSessionData(sessionData);
    return this.encryptUserData(sanitizedData, userId);
  }

  /**
   * Encrypt pose data (contains biometric information)
   */
  async encryptPoseData(poseData: any, userId: string): Promise<string> {
    // Pose data is considered sensitive biometric data
    const sanitizedPose = {
      ...poseData,
      // Remove any identifying features
      timestamp: Math.floor(poseData.timestamp / 1000) * 1000, // Round to nearest second
      // Keep only essential pose points, remove face landmarks if present
      keypoints: poseData.keypoints?.filter((kp: any) => !kp.name?.includes('face'))
    };
    
    return this.encryptUserData(sanitizedPose, userId);
  }

  /**
   * Sanitize session data before encryption
   */
  private sanitizeSessionData(sessionData: any): any {
    return {
      ...sessionData,
      // Remove or hash any PII
      userId: crypto.createHash('sha256').update(sessionData.userId).digest('hex').substring(0, 16),
      // Keep workout metrics but remove identifying information
      exercises: sessionData.exercises?.map((ex: any) => ({
        ...ex,
        // Remove any notes or comments that might contain PII
        notes: undefined,
        comments: undefined
      }))
    };
  }

  /**
   * Get encryption statistics for monitoring
   */
  getEncryptionStats(): any {
    return {
      totalKeys: this.masterKeys.size,
      algorithm: this.algorithm,
      keyLength: this.keyLength,
      isInitialized: this.masterKeys.size > 0
    };
  }

  /**
   * Health check for KMS service
   */
  async healthCheck(): Promise<boolean> {
    try {
      // Test encryption/decryption with dummy data
      const testData = 'health-check-test';
      const testUserId = 'health-check-user';
      
      const envelope = await this.encryptWithEnvelope(testData, testUserId);
      const result = await this.decryptFromEnvelope(envelope);
      
      return result.data === testData;
    } catch (error) {
      this.logger.error('KMS health check failed:', error);
      return false;
    }
  }
}
