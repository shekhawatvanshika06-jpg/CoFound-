"""Shared fixtures for backend tests."""
import os
import time
import pytest
import requests
from dotenv import load_dotenv
from pathlib import Path

load_dotenv(Path(__file__).resolve().parents[2] / "frontend" / ".env")

BASE_URL = os.environ["EXPO_PUBLIC_BACKEND_URL"].rstrip("/")


@pytest.fixture(scope="session")
def base_url():
    return BASE_URL


@pytest.fixture(scope="session")
def api_client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def aarav_token(api_client):
    r = api_client.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": "aarav@cofound.demo", "password": "demo1234"},
    )
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture(scope="session")
def aarav_user(api_client, aarav_token):
    r = api_client.get(f"{BASE_URL}/api/auth/me", headers={"Authorization": f"Bearer {aarav_token}"})
    assert r.status_code == 200
    return r.json()


@pytest.fixture(scope="session")
def rohit_token(api_client):
    r = api_client.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": "rohit@cofound.demo", "password": "demo1234"},
    )
    assert r.status_code == 200
    return r.json()["token"]


@pytest.fixture(scope="session")
def rohit_user(api_client, rohit_token):
    r = api_client.get(f"{BASE_URL}/api/auth/me", headers={"Authorization": f"Bearer {rohit_token}"})
    assert r.status_code == 200
    return r.json()


@pytest.fixture(scope="session")
def fresh_signup(api_client):
    """Create a brand-new signup user (unique email) for onboarding & isolation tests."""
    email = f"TEST_signup_{int(time.time()*1000)}@cofound-test.com"
    r = api_client.post(
        f"{BASE_URL}/api/auth/signup",
        json={"email": email, "password": "Passw0rd!", "name": "Test Signup"},
    )
    assert r.status_code == 200, r.text
    return {"email": email, **r.json()}
