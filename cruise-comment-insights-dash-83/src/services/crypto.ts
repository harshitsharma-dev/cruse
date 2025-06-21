// Encryption utilities for secure data transmission
class CryptoService {
  private static algorithm = 'AES-GCM';
  private static keyLength = 256;
  
  // Generate a random encryption key
  static async generateKey(): Promise<CryptoKey> {
    return await crypto.subtle.generateKey(
      {
        name: this.algorithm,
        length: this.keyLength,
      },
      true,
      ['encrypt', 'decrypt']
    );
  }
  
  // Export key to base64 string for transmission
  static async exportKey(key: CryptoKey): Promise<string> {
    const exported = await crypto.subtle.exportKey('raw', key);
    return btoa(String.fromCharCode(...new Uint8Array(exported)));
  }
  
  // Import key from base64 string
  static async importKey(keyBase64: string): Promise<CryptoKey> {
    const keyData = new Uint8Array(
      atob(keyBase64).split('').map(char => char.charCodeAt(0))
    );
    
    return await crypto.subtle.importKey(
      'raw',
      keyData,
      {
        name: this.algorithm,
        length: this.keyLength,
      },
      true,
      ['encrypt', 'decrypt']
    );
  }
    // Encrypt data with AES-GCM
  static async encrypt(data: string, key: CryptoKey): Promise<{
    encryptedData: string;
    iv: string;
  }> {
    try {
      console.log('🔐 CryptoService.encrypt called with data length:', data.length);
      
      const encoder = new TextEncoder();
      const dataBuffer = encoder.encode(data);
      console.log('Data encoded to buffer, length:', dataBuffer.length);
      
      // Generate a random initialization vector
      const iv = crypto.getRandomValues(new Uint8Array(12));
      console.log('IV generated, length:', iv.length);
      
      const encryptedBuffer = await crypto.subtle.encrypt(
        {
          name: this.algorithm,
          iv: iv,
        },
        key,
        dataBuffer
      );
      console.log('Data encrypted, buffer length:', encryptedBuffer.byteLength);
      
      const result = {
        encryptedData: btoa(String.fromCharCode(...new Uint8Array(encryptedBuffer))),
        iv: btoa(String.fromCharCode(...iv)),
      };
      
      console.log('✅ Encryption completed successfully');
      return result;
    } catch (error) {
      console.error('❌ CryptoService.encrypt failed:', error);
      throw error;
    }
  }
  
  // Decrypt data with AES-GCM
  static async decrypt(
    encryptedData: string,
    iv: string,
    key: CryptoKey
  ): Promise<string> {
    const encryptedBuffer = new Uint8Array(
      atob(encryptedData).split('').map(char => char.charCodeAt(0))
    );
    const ivBuffer = new Uint8Array(
      atob(iv).split('').map(char => char.charCodeAt(0))
    );
    
    const decryptedBuffer = await crypto.subtle.decrypt(
      {
        name: this.algorithm,
        iv: ivBuffer,
      },
      key,
      encryptedBuffer
    );
    
    const decoder = new TextDecoder();
    return decoder.decode(decryptedBuffer);
  }
  
  // Generate a secure session key for login
  static async generateSessionKey(): Promise<string> {
    const key = await this.generateKey();
    return await this.exportKey(key);
  }
    // Encrypt login credentials
  static async encryptCredentials(credentials: {
    username: string;
    password: string;
  }): Promise<{
    encryptedData: string;
    iv: string;
    sessionKey: string;
  }> {
    try {
      console.log('🔐 CryptoService.encryptCredentials called');
      console.log('Credentials to encrypt:', { username: credentials.username, passwordLength: credentials.password?.length });
      
      // Check Web Crypto API availability
      if (!window.crypto || !window.crypto.subtle) {
        throw new Error('Web Crypto API not available in this browser');
      }
      console.log('✅ Web Crypto API available');
      
      // Generate a new session key for this login attempt
      console.log('Generating encryption key...');
      const key = await this.generateKey();
      console.log('✅ Key generated');
      
      const sessionKey = await this.exportKey(key);
      console.log('✅ Key exported, session key length:', sessionKey.length);
      
      // Encrypt the credentials
      console.log('Converting credentials to JSON...');
      const credentialsJson = JSON.stringify(credentials);
      console.log('JSON length:', credentialsJson.length);
      
      console.log('Encrypting credentials...');
      const encrypted = await this.encrypt(credentialsJson, key);
      console.log('✅ Credentials encrypted successfully');
      
      const result = {
        encryptedData: encrypted.encryptedData,
        iv: encrypted.iv,
        sessionKey,
      };
      
      console.log('Final encrypted payload lengths:', {
        encryptedData: result.encryptedData.length,
        iv: result.iv.length,
        sessionKey: result.sessionKey.length
      });
      
      return result;
    } catch (error) {
      console.error('❌ CryptoService.encryptCredentials failed:', error);
      console.error('Error type:', typeof error);
      console.error('Error message:', error instanceof Error ? error.message : 'Unknown error');
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack');
      throw error;
    }
  }
  
  // Hash password with salt for additional security
  static async hashPassword(password: string, salt?: string): Promise<{
    hashedPassword: string;
    salt: string;
  }> {
    const usedSalt = salt || crypto.getRandomValues(new Uint8Array(16));
    const saltArray = typeof usedSalt === 'string' 
      ? new Uint8Array(atob(usedSalt).split('').map(char => char.charCodeAt(0)))
      : usedSalt;
    
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    
    // Combine password and salt
    const combined = new Uint8Array(data.length + saltArray.length);
    combined.set(data);
    combined.set(saltArray, data.length);
    
    // Hash with SHA-256
    const hashBuffer = await crypto.subtle.digest('SHA-256', combined);
    const hashArray = new Uint8Array(hashBuffer);
    
    return {
      hashedPassword: btoa(String.fromCharCode(...hashArray)),
      salt: btoa(String.fromCharCode(...saltArray)),
    };
  }
}

export default CryptoService;
