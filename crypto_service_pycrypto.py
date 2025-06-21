import base64
import json
import hashlib
from Crypto.Cipher import AES
from Crypto.Util.Padding import unpad
import binascii

class CryptoService:
    """Backend crypto service for decrypting frontend-encrypted data"""
    
    @staticmethod
    def decrypt_credentials(encrypted_data: str, iv: str, session_key: str) -> dict:
        """
        Decrypt credentials sent from frontend using pycryptodome
        
        Args:
            encrypted_data: Base64 encoded encrypted credentials
            iv: Base64 encoded initialization vector
            session_key: Base64 encoded AES key
            
        Returns:
            dict: Decrypted credentials containing username and password
        """
        try:
            # Decode base64 data
            encrypted_bytes = base64.b64decode(encrypted_data)
            iv_bytes = base64.b64decode(iv)
            key_bytes = base64.b64decode(session_key)
            
            # For GCM mode with pycryptodome
            cipher = AES.new(key_bytes, AES.MODE_GCM, nonce=iv_bytes)
            
            # Split encrypted data and auth tag (GCM mode)
            # In GCM mode, the last 16 bytes are the auth tag
            auth_tag = encrypted_bytes[-16:]
            ciphertext = encrypted_bytes[:-16]
            
            # Decrypt and verify
            decrypted_bytes = cipher.decrypt_and_verify(ciphertext, auth_tag)
            
            # Convert to string and parse JSON
            decrypted_string = decrypted_bytes.decode('utf-8')
            credentials = json.loads(decrypted_string)
            
            return credentials
            
        except Exception as e:
            raise ValueError(f"Decryption failed: {str(e)}")
    
    @staticmethod
    def is_encrypted_request(data: dict) -> bool:
        """Check if the request contains encrypted data"""
        return (
            data.get('encrypted') is True and
            'encryptedData' in data and
            'iv' in data and
            'sessionKey' in data
        )
