import base64
import json
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.primitives import padding
from cryptography.hazmat.backends import default_backend
import os

class CryptoService:
    """Backend crypto service for decrypting frontend-encrypted data"""
    
    @staticmethod
    def decrypt_credentials(encrypted_data: str, iv: str, session_key: str) -> dict:
        """
        Decrypt credentials sent from frontend
        
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
            
            # Create cipher
            cipher = Cipher(
                algorithms.AES(key_bytes),
                modes.GCM(iv_bytes),
                backend=default_backend()
            )
            
            # Split encrypted data and auth tag (GCM mode)
            # In GCM mode, the last 16 bytes are the auth tag
            auth_tag = encrypted_bytes[-16:]
            ciphertext = encrypted_bytes[:-16]
            
            # Decrypt
            decryptor = cipher.decryptor()
            decryptor.authenticate_additional_data(b"")  # No additional data
            decrypted_bytes = decryptor.update(ciphertext) + decryptor.finalize_with_tag(auth_tag)
            
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
