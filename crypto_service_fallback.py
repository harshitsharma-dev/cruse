import base64
import json

class CryptoService:
    """Fallback crypto service when cryptography library has issues"""
    
    @staticmethod
    def decrypt_credentials(encrypted_data: str, iv: str, session_key: str) -> dict:
        """
        Fallback: Return error for encrypted requests
        This should only be used temporarily while fixing crypto issues
        """
        raise ValueError("Encryption temporarily disabled due to library compatibility issues")
    
    @staticmethod
    def is_encrypted_request(data: dict) -> bool:
        """Check if the request contains encrypted data"""
        return (
            data.get('encrypted') is True and
            'encryptedData' in data and
            'iv' in data and
            'sessionKey' in data
        )
