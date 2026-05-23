"""End-to-end backend tests for Cofound API."""
import os
import time
import requests
import pytest

BASE_URL = os.environ["EXPO_PUBLIC_BACKEND_URL"].rstrip("/")


def auth(token):
    return {"Authorization": f"Bearer {token}"}


# ── health & meta ──
class TestHealth:
    def test_health(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/health")
        assert r.status_code == 200
        assert r.json()["status"] == "ok"

    def test_meta(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/meta")
        assert r.status_code == 200
        d = r.json()
        for k in ["skills", "interests", "goals", "stages", "times", "cities"]:
            assert k in d and isinstance(d[k], list) and len(d[k]) > 0


# ── auth ──
class TestAuth:
    def test_login_seeded(self, api_client):
        r = api_client.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "aarav@cofound.demo", "password": "demo1234"},
        )
        assert r.status_code == 200
        d = r.json()
        assert "token" in d and "user" in d
        assert d["user"]["email"] == "aarav@cofound.demo"
        assert d["user"]["onboarded"] is True

    def test_login_wrong_pw(self, api_client):
        r = api_client.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "aarav@cofound.demo", "password": "wrong"},
        )
        assert r.status_code == 401

    def test_signup_creates_user(self, api_client):
        email = f"TEST_su_{int(time.time()*1000)}@cofound-test.com"
        r = api_client.post(
            f"{BASE_URL}/api/auth/signup",
            json={"email": email, "password": "Passw0rd!", "name": "Test SU"},
        )
        assert r.status_code == 200
        d = r.json()
        assert d["user"]["onboarded"] is False
        assert d["user"]["email"] == email.lower()
        assert d["token"]

    def test_signup_duplicate_email(self, api_client):
        r = api_client.post(
            f"{BASE_URL}/api/auth/signup",
            json={"email": "aarav@cofound.demo", "password": "x", "name": "Dup"},
        )
        assert r.status_code == 400

    def test_me_with_token(self, api_client, aarav_token):
        r = api_client.get(f"{BASE_URL}/api/auth/me", headers=auth(aarav_token))
        assert r.status_code == 200
        assert r.json()["email"] == "aarav@cofound.demo"

    def test_me_without_token(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/auth/me")
        assert r.status_code == 401

    def test_me_invalid_token(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/auth/me", headers=auth("garbage"))
        assert r.status_code == 401


# ── profile / onboarding ──
class TestProfile:
    def test_profile_update_sets_onboarded(self, api_client, fresh_signup):
        token = fresh_signup["token"]
        body = {
            "name": "Test Onboarded",
            "skills": ["Frontend", "AI / ML"],
            "interests": ["AI", "SaaS"],
            "goal": "Find a cofounder",
            "stage": "Building MVP",
            "time_commit": "Full-time",
            "city": "Bangalore",
            "bio": "test bio",
        }
        r = api_client.put(f"{BASE_URL}/api/me/profile", json=body, headers=auth(token))
        assert r.status_code == 200
        d = r.json()
        assert d["onboarded"] is True
        assert d["city"] == "Bangalore"
        assert "Frontend" in d["skills"]

        # GET to verify persistence
        r2 = api_client.get(f"{BASE_URL}/api/auth/me", headers=auth(token))
        assert r2.status_code == 200
        assert r2.json()["onboarded"] is True
        assert r2.json()["skills"] == ["Frontend", "AI / ML"]


# ── matches ──
class TestMatches:
    def test_matches_for_aarav(self, api_client, aarav_token):
        r = api_client.get(f"{BASE_URL}/api/matches", headers=auth(aarav_token))
        assert r.status_code == 200
        matches = r.json()["matches"]
        assert isinstance(matches, list)
        # 14 seeded - aarav = 13
        assert len(matches) >= 13
        first = matches[0]
        for k in ["user_id", "name", "match_score", "reasons", "connection_status"]:
            assert k in first
        # Sorted desc
        scores = [m["match_score"] for m in matches]
        assert scores == sorted(scores, reverse=True)

    def test_matches_empty_for_unonboarded(self, api_client):
        # use brand-new isolated signup so onboarding hasn't been set yet
        import time as _t
        email = f"TEST_unb_{int(_t.time()*1000)}@cofound-test.com"
        r = api_client.post(
            f"{BASE_URL}/api/auth/signup",
            json={"email": email, "password": "Passw0rd!", "name": "Unb"},
        )
        tok = r.json()["token"]
        r = api_client.get(f"{BASE_URL}/api/matches", headers=auth(tok))
        assert r.status_code == 200
        assert r.json()["matches"] == []


# ── connect / chat ──
class TestConnectAndChat:
    @pytest.fixture(scope="class")
    def pair_tokens(self, api_client):
        """Two fresh users so we can run the full connect+chat flow cleanly."""
        ts = int(time.time() * 1000)
        users = []
        for i in range(2):
            email = f"TEST_pair{i}_{ts}@cofound-test.com"
            r = api_client.post(
                f"{BASE_URL}/api/auth/signup",
                json={"email": email, "password": "Passw0rd!", "name": f"Pair {i}"},
            )
            assert r.status_code == 200
            tok = r.json()["token"]
            # Onboard them
            body = {
                "name": f"Pair {i}", "skills": ["Backend"], "interests": ["AI"],
                "goal": "Find a cofounder", "stage": "Building MVP",
                "time_commit": "Full-time", "city": "Bangalore", "bio": "",
            }
            api_client.put(f"{BASE_URL}/api/me/profile", json=body, headers=auth(tok))
            me = api_client.get(f"{BASE_URL}/api/auth/me", headers=auth(tok)).json()
            users.append({"token": tok, "user_id": me["user_id"], "email": email})
        return users

    def test_connect_pending_idempotent(self, api_client, pair_tokens):
        a, b = pair_tokens
        r1 = api_client.post(f"{BASE_URL}/api/connect/{b['user_id']}", headers=auth(a["token"]))
        assert r1.status_code == 200
        assert r1.json()["status"] == "pending"
        req_id = r1.json()["request_id"]
        # Second call returns same
        r2 = api_client.post(f"{BASE_URL}/api/connect/{b['user_id']}", headers=auth(a["token"]))
        assert r2.status_code == 200
        assert r2.json()["status"] == "pending"
        assert r2.json()["request_id"] == req_id

    def test_chat_blocked_until_accepted(self, api_client, pair_tokens):
        a, b = pair_tokens
        r = api_client.post(
            f"{BASE_URL}/api/chats/{b['user_id']}/messages",
            json={"content": "hi"}, headers=auth(a["token"]),
        )
        assert r.status_code == 403

    def test_requests_listing(self, api_client, pair_tokens):
        a, b = pair_tokens
        r_a = api_client.get(f"{BASE_URL}/api/connect/requests", headers=auth(a["token"]))
        r_b = api_client.get(f"{BASE_URL}/api/connect/requests", headers=auth(b["token"]))
        assert r_a.status_code == 200 and r_b.status_code == 200
        assert any(o["user"]["user_id"] == b["user_id"] for o in r_a.json()["outgoing"])
        assert any(o["user"]["user_id"] == a["user_id"] for o in r_b.json()["incoming"])

    def test_accept_then_chat(self, api_client, pair_tokens):
        a, b = pair_tokens
        incoming = api_client.get(
            f"{BASE_URL}/api/connect/requests", headers=auth(b["token"])
        ).json()["incoming"]
        req_id = [x for x in incoming if x["user"]["user_id"] == a["user_id"]][0]["request_id"]

        # Auth scope: A cannot accept B's incoming request
        wrong = api_client.post(
            f"{BASE_URL}/api/connect/{req_id}/accept", headers=auth(a["token"])
        )
        assert wrong.status_code == 404

        ok = api_client.post(
            f"{BASE_URL}/api/connect/{req_id}/accept", headers=auth(b["token"])
        )
        assert ok.status_code == 200

        # Now chat works
        s = api_client.post(
            f"{BASE_URL}/api/chats/{b['user_id']}/messages",
            json={"content": "hello cofounder"}, headers=auth(a["token"]),
        )
        assert s.status_code == 200
        assert s.json()["content"] == "hello cofounder"

        g = api_client.get(
            f"{BASE_URL}/api/chats/{a['user_id']}/messages", headers=auth(b["token"])
        )
        assert g.status_code == 200
        msgs = g.json()["messages"]
        assert len(msgs) >= 1
        assert msgs[-1]["content"] == "hello cofounder"

        # `since` filter
        latest_iso = msgs[-1]["created_at"]
        g2 = api_client.get(
            f"{BASE_URL}/api/chats/{a['user_id']}/messages",
            params={"since": latest_iso}, headers=auth(b["token"]),
        )
        assert g2.status_code == 200
        assert g2.json()["messages"] == []

    def test_reject_request(self, api_client):
        ts = int(time.time() * 1000)
        users = []
        for i in range(2):
            email = f"TEST_rej{i}_{ts}@cofound-test.com"
            r = api_client.post(
                f"{BASE_URL}/api/auth/signup",
                json={"email": email, "password": "Passw0rd!", "name": f"Rej {i}"},
            )
            tok = r.json()["token"]
            body = {
                "name": f"Rej {i}", "skills": ["Backend"], "interests": ["AI"],
                "goal": "Find a cofounder", "stage": "Building MVP",
                "time_commit": "Full-time", "city": "Mumbai", "bio": "",
            }
            api_client.put(f"{BASE_URL}/api/me/profile", json=body, headers=auth(tok))
            me = api_client.get(f"{BASE_URL}/api/auth/me", headers=auth(tok)).json()
            users.append({"token": tok, "user_id": me["user_id"]})
        a, b = users
        c = api_client.post(f"{BASE_URL}/api/connect/{b['user_id']}", headers=auth(a["token"]))
        req_id = c.json()["request_id"]
        rej = api_client.post(f"{BASE_URL}/api/connect/{req_id}/reject", headers=auth(b["token"]))
        assert rej.status_code == 200


# ── rooms ──
class TestRooms:
    def test_rooms_list(self, api_client, aarav_token):
        r = api_client.get(f"{BASE_URL}/api/rooms", headers=auth(aarav_token))
        assert r.status_code == 200
        rooms = r.json()["rooms"]
        assert len(rooms) == 8
        for k in ["id", "name", "emoji", "members", "joined"]:
            assert k in rooms[0]

    def test_room_join_leave(self, api_client, aarav_token):
        # Use a fresh user to avoid polluting Aarav state
        ts = int(time.time() * 1000)
        email = f"TEST_room_{ts}@cofound-test.com"
        r = api_client.post(
            f"{BASE_URL}/api/auth/signup",
            json={"email": email, "password": "Passw0rd!", "name": "Room User"},
        )
        tok = r.json()["token"]

        before = api_client.get(f"{BASE_URL}/api/rooms", headers=auth(tok)).json()["rooms"]
        ai = next(x for x in before if x["id"] == "ai")
        assert ai["joined"] is False
        base_count = ai["members"]

        j = api_client.post(f"{BASE_URL}/api/rooms/ai/join", headers=auth(tok))
        assert j.status_code == 200 and j.json()["joined"] is True

        after = api_client.get(f"{BASE_URL}/api/rooms", headers=auth(tok)).json()["rooms"]
        ai2 = next(x for x in after if x["id"] == "ai")
        assert ai2["joined"] is True
        assert ai2["members"] == base_count + 1

        lv = api_client.post(f"{BASE_URL}/api/rooms/ai/leave", headers=auth(tok))
        assert lv.status_code == 200 and lv.json()["joined"] is False

        after2 = api_client.get(f"{BASE_URL}/api/rooms", headers=auth(tok)).json()["rooms"]
        ai3 = next(x for x in after2 if x["id"] == "ai")
        assert ai3["joined"] is False


# ── mentor (real LLM — keep tiny) ──
class TestMentor:
    def test_mentor_state_default(self, api_client):
        ts = int(time.time() * 1000)
        email = f"TEST_mentor_{ts}@cofound-test.com"
        r = api_client.post(
            f"{BASE_URL}/api/auth/signup",
            json={"email": email, "password": "Passw0rd!", "name": "Mentor User"},
        )
        tok = r.json()["token"]
        # need onboarding? No — mentor doesn't require it
        s = api_client.get(f"{BASE_URL}/api/mentor", headers=auth(tok))
        assert s.status_code == 200
        d = s.json()
        assert d["limit"] == 5
        assert d["used"] == 0
        assert d["remaining"] == 5
        assert d["messages"] == []

    def test_mentor_send_and_quota(self, api_client):
        ts = int(time.time() * 1000)
        email = f"TEST_mentor2_{ts}@cofound-test.com"
        r = api_client.post(
            f"{BASE_URL}/api/auth/signup",
            json={"email": email, "password": "Passw0rd!", "name": "Mentor U"},
        )
        tok = r.json()["token"]
        # One real LLM call
        r1 = api_client.post(
            f"{BASE_URL}/api/mentor",
            json={"content": "In one sentence, what's a good MVP idea for an AI dev tool?"},
            headers=auth(tok), timeout=60,
        )
        assert r1.status_code == 200, r1.text
        d = r1.json()
        assert d["user_message"]["role"] == "user"
        assert d["assistant_message"]["role"] == "assistant"
        assert len(d["assistant_message"]["content"]) > 0
        assert d["used"] == 1
        assert d["remaining"] == 4
