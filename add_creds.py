import yaml
from werkzeug.security import generate_password_hash
from pathlib import Path
import getpass  # For secure password input
import sys

def add_user_to_auth_file():
    # File path configuration
    auth_file = Path("sailing_auth.yaml")
    
    # Create directory if it doesn't exist
    auth_file.parent.mkdir(exist_ok=True)
    
    # Load existing data or initialize empty structure
    if auth_file.exists():
        with open(auth_file, 'r') as f:
            auth_data = yaml.safe_load(f) or {}
    else:
        auth_data = {}
    
    # Initialize users dictionary if it doesn't exist
    if 'users' not in auth_data:
        auth_data['users'] = {}
    
    # Get user input
    print("\n=== Add New User ===")
    username = input("Username: ").strip()
    
    # Check if user already exists
    if username in auth_data['users']:
        print(f"Error: User '{username}' already exists!")
        return
    
    # Get password securely
    while True:
        password = getpass.getpass("Password: ").strip()
        confirm_password = getpass.getpass("Confirm Password: ").strip()
        
        if password != confirm_password:
            print("Error: Passwords don't match! Try again.")
        elif len(password) < 8:
            print("Error: Password must be at least 8 characters!")
        else:
            break
    
    # Get optional role
    role = input("Role (optional, press Enter to skip): ").strip() or "user"
    
    # Hash the password
    hashed_password = generate_password_hash(password, method='pbkdf2:sha256')
    
    # Add user to data structure
    auth_data['users'][username] = {
        'password': hashed_password,
        'role': role
    }
    
    # Write back to file
    with open(auth_file, 'w') as f:
        yaml.dump(auth_data, f, sort_keys=False)
      print(f"\nSuccessfully added user '{username}' with role '{role}'")
    print(f"Credentials saved to {auth_file}")

def reset_user_password():
    """Reset password for an existing user"""
    # File path configuration
    auth_file = Path("sailing_auth.yaml")
    
    # Check if auth file exists
    if not auth_file.exists():
        print("Error: No users found! sailing_auth.yaml doesn't exist.")
        print("Please add users first using option 1.")
        return
    
    # Load existing data
    with open(auth_file, 'r') as f:
        auth_data = yaml.safe_load(f) or {}
    
    # Check if users exist
    if 'users' not in auth_data or not auth_data['users']:
        print("Error: No users found in the system!")
        return
    
    # Show existing users
    print("\n=== Reset User Password ===")
    print("Existing users:")
    for username, user_data in auth_data['users'].items():
        role = user_data.get('role', 'user')
        print(f"  - {username} (role: {role})")
    
    # Get username to reset
    username = input("\nEnter username to reset password: ").strip()
    
    # Check if user exists
    if username not in auth_data['users']:
        print(f"Error: User '{username}' not found!")
        return
    
    # Get new password securely
    print(f"\nResetting password for user: {username}")
    while True:
        password = getpass.getpass("New Password: ").strip()
        confirm_password = getpass.getpass("Confirm New Password: ").strip()
        
        if password != confirm_password:
            print("Error: Passwords don't match! Try again.")
        elif len(password) < 8:
            print("Error: Password must be at least 8 characters!")
        else:
            break
    
    # Hash the new password
    hashed_password = generate_password_hash(password, method='pbkdf2:sha256')
    
    # Update user's password (keep existing role)
    auth_data['users'][username]['password'] = hashed_password
    
    # Write back to file
    with open(auth_file, 'w') as f:
        yaml.dump(auth_data, f, sort_keys=False)
    
    print(f"\nSuccessfully reset password for user '{username}'")
    print(f"Changes saved to {auth_file}")

def list_users():
    """List all existing users"""
    # File path configuration
    auth_file = Path("sailing_auth.yaml")
    
    # Check if auth file exists
    if not auth_file.exists():
        print("Error: No users found! sailing_auth.yaml doesn't exist.")
        return
    
    # Load existing data
    with open(auth_file, 'r') as f:
        auth_data = yaml.safe_load(f) or {}
    
    # Check if users exist
    if 'users' not in auth_data or not auth_data['users']:
        print("No users found in the system!")
        return
    
    print("\n=== Current Users ===")
    print(f"Total users: {len(auth_data['users'])}")
    print("-" * 40)
    
    for username, user_data in auth_data['users'].items():
        role = user_data.get('role', 'user')
        print(f"Username: {username}")
        print(f"Role: {role}")
        print("-" * 40)

def main_menu():
    """Main menu for user management"""
    while True:
        print("\n" + "="*50)
        print("     Apollo Intelligence - User Management")
        print("="*50)
        print("1. Add New User")
        print("2. Reset User Password")
        print("3. List All Users")
        print("4. Exit")
        print("-" * 50)
        
        choice = input("Select an option (1-4): ").strip()
        
        if choice == '1':
            add_user_to_auth_file()
        elif choice == '2':
            reset_user_password()
        elif choice == '3':
            list_users()
        elif choice == '4':
            print("\nGoodbye!")
            sys.exit(0)
        else:
            print("Invalid option! Please select 1-4.")
        
        # Ask if user wants to continue
        continue_choice = input("\nDo you want to perform another action? (y/n): ").strip().lower()
        if continue_choice not in ['y', 'yes']:
            print("\nGoodbye!")
            break

if __name__ == "__main__":
    main_menu()