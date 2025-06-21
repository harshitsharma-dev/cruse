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
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    
    // Generate a random initialization vector
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    const encryptedBuffer = await crypto.subtle.encrypt(
      {
        name: this.algorithm,
        iv: iv,
      },
      key,
      dataBuffer
    );
    
    return {
      encryptedData: btoa(String.fromCharCode(...new Uint8Array(encryptedBuffer))),
      iv: btoa(String.fromCharCode(...iv)),
    };
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
    // Generate a new session key for this login attempt
    const key = await this.generateKey();
    const sessionKey = await this.exportKey(key);
    
    // Encrypt the credentials
    const credentialsJson = JSON.stringify(credentials);
    const encrypted = await this.encrypt(credentialsJson, key);
    
    return {
      encryptedData: encrypted.encryptedData,
      iv: encrypted.iv,
      sessionKey,
    };
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
