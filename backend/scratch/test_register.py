import httpx
import json

def test_register():
    url = "http://localhost:8000/api/auth/register"
    
    # Payload similar to what frontend sends
    payload = {
        "username": "testuser_" + str(hash("test@example.com") % 1000),
        "email": "test@example.com",
        "password": "password123", # This should fail because no uppercase
        "name": "Test User",
        "level": "beginner",
        "language": "en"
    }
    
    try:
        response = httpx.post(url, json=payload)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_register()
