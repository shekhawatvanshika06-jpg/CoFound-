"""Cofound backend — cofounder matching app.

FastAPI + MongoDB. Auth: email/password JWT + Emergent-managed Google OAuth.
AI Mentor: Claude Sonnet 4.5 via emergentintegrations.
"""
import logging
import os
import secrets
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import List, Literal, Optional

import bcrypt
import httpx
import jwt
from dotenv import load_dotenv
from emergentintegrations.llm.chat import LlmChat, UserMessage
from fastapi import APIRouter, FastAPI, Header, HTTPException
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, EmailStr, Field
from starlette.middleware.cors import CORSMiddleware

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]
JWT_SECRET = os.environ["JWT_SECRET"]
EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY", "")

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

app = FastAPI(title="Cofound API")
api = APIRouter(prefix="/api")

# ───────────────────────── constants ─────────────────────────

SKILL_META = {
    "Frontend": "Tech", "Backend": "Tech", "AI / ML": "Tech", "Mobile": "Tech", "Data": "Tech",
    "UI / UX": "Design", "Branding": "Design",
    "Marketing": "Growth", "Sales": "Growth", "Biz Dev": "Growth", "Finance": "Growth",
    "Product": "Product", "Strategy": "Product",
    "Content": "Content", "Video": "Content",
}

ROOMS_SEED = [
    {"id": "ai", "name": "AI Builders", "emoji": "🤖", "members": 1240, "desc": "LLMs, agents, ML products"},
    {"id": "saas", "name": "SaaS & Tools", "emoji": "🛠️", "members": 980, "desc": "B2B, micro-SaaS, dev tools"},
    {"id": "fintech", "name": "FinTech", "emoji": "💸", "members": 760, "desc": "Payments, lending, wealth"},
    {"id": "edtech", "name": "EdTech", "emoji": "📚", "members": 690, "desc": "Learning, skilling, exams"},
    {"id": "gaming", "name": "Gaming", "emoji": "🎮", "members": 540, "desc": "Games, engines, esports"},
    {"id": "space", "name": "Space & Deep Tech", "emoji": "🛰️", "members": 310, "desc": "Hardware, robotics, frontier"},
    {"id": "creator", "name": "Creator Economy", "emoji": "🎬", "members": 870, "desc": "Content, audience, monetisation"},
    {"id": "climate", "name": "Climate", "emoji": "🌱", "members": 280, "desc": "Energy, sustainability, impact"},
]

DEMO_USERS_SEED = [
    {"name": "Aarav Mehta", "email": "aarav@cofound.demo", "skills": ["UI / UX", "Branding"], "interests": ["AI", "SaaS"], "goal": "Find a cofounder", "stage": "Building MVP", "time_commit": "3-4 hrs/day", "city": "Jaipur", "bio": "Designer who ships. Looking for a technical cofounder for an AI writing tool."},
    {"name": "Priya Sharma", "email": "priya@cofound.demo", "skills": ["Marketing", "Content"], "interests": ["EdTech", "Creator Economy"], "goal": "Join a team", "stage": "Just an idea", "time_commit": "1-2 hrs/day", "city": "Kota", "bio": "Growth + content. I make things spread."},
    {"name": "Rohit Verma", "email": "rohit@cofound.demo", "skills": ["Backend", "AI / ML"], "interests": ["AI", "FinTech"], "goal": "Build a startup", "stage": "Building MVP", "time_commit": "Full-time", "city": "Bangalore", "bio": "Backend + ML. Built 2 side projects. Want a serious team."},
    {"name": "Sneha Iyer", "email": "sneha@cofound.demo", "skills": ["Product", "Strategy"], "interests": ["HealthTech", "SaaS"], "goal": "Find a cofounder", "stage": "Have early users", "time_commit": "Full-time", "city": "Mumbai", "bio": "Ex-PM. 40 paying users on a clinic tool. Need engineering muscle."},
    {"name": "Karan Singh", "email": "karan@cofound.demo", "skills": ["Frontend", "Mobile"], "interests": ["Gaming", "AI"], "goal": "Join a team", "stage": "Just an idea", "time_commit": "3-4 hrs/day", "city": "Jaipur", "bio": "React + Flutter. Fast hands. Want to build something fun."},
    {"name": "Ananya Roy", "email": "ananya@cofound.demo", "skills": ["Sales", "Biz Dev"], "interests": ["FinTech", "E-commerce"], "goal": "Find a cofounder", "stage": "Just an idea", "time_commit": "3-4 hrs/day", "city": "Delhi", "bio": "I can sell. Looking for a builder who hates selling."},
    {"name": "Dev Patel", "email": "dev@cofound.demo", "skills": ["AI / ML", "Data"], "interests": ["AI", "Space"], "goal": "Build a startup", "stage": "Building MVP", "time_commit": "Full-time", "city": "Hyderabad", "bio": "ML research background. Obsessed with agents."},
    {"name": "Ishita Nair", "email": "ishita@cofound.demo", "skills": ["UI / UX", "Frontend"], "interests": ["Creator Economy", "EdTech"], "goal": "Join a team", "stage": "Just an idea", "time_commit": "1-2 hrs/day", "city": "Pune", "bio": "Design-engineer hybrid. I make MVPs look real."},
    {"name": "Manav Gupta", "email": "manav@cofound.demo", "skills": ["Marketing", "Strategy"], "interests": ["SaaS", "AI"], "goal": "Find a cofounder", "stage": "Building MVP", "time_commit": "3-4 hrs/day", "city": "Indore", "bio": "GTM + positioning. Tier-2 hustle."},
    {"name": "Tara Bose", "email": "tara@cofound.demo", "skills": ["Backend", "Frontend"], "interests": ["Climate", "SaaS"], "goal": "Build a startup", "stage": "Have early users", "time_commit": "Full-time", "city": "Remote", "bio": "Full-stack. Shipping a carbon-tracking tool solo, need a team."},
    {"name": "Vikram Rao", "email": "vikram@cofound.demo", "skills": ["Finance", "Strategy"], "interests": ["FinTech", "Web3"], "goal": "Find a cofounder", "stage": "Raising", "time_commit": "Full-time", "city": "Mumbai", "bio": "Finance + ops. Have an angel cheque lined up."},
    {"name": "Meera Joshi", "email": "meera@cofound.demo", "skills": ["Content", "Video"], "interests": ["Creator Economy", "Gaming"], "goal": "Join a team", "stage": "Just an idea", "time_commit": "3-4 hrs/day", "city": "Jaipur", "bio": "Video + storytelling. I'll make your launch loud."},
    {"name": "Aditya Kapoor", "email": "aditya@cofound.demo", "skills": ["AI / ML", "Product"], "interests": ["AI", "HealthTech"], "goal": "Build a startup", "stage": "Building MVP", "time_commit": "Full-time", "city": "Bangalore", "bio": "Building diagnostic AI. Need a designer + growth."},
    {"name": "Nisha Reddy", "email": "nisha@cofound.demo", "skills": ["UI / UX", "Marketing"], "interests": ["EdTech", "AI"], "goal": "Find a cofounder", "stage": "Just an idea", "time_commit": "3-4 hrs/day", "city": "Hyderabad", "bio": "Design + growth in one. Looking for someone technical."},
]

FREE_MENTOR_MSGS = 5

# ───────────────────────── models ─────────────────────────


class User(BaseModel):
    user_id: str
    email: str
    name: str
    auth_provider: Literal["email", "google"] = "email"
    avatar: Optional[str] = None
    onboarded: bool = False
    skills: List[str] = []
    interests: List[str] = []
    goal: Optional[str] = None
    stage: Optional[str] = None
    time_commit: Optional[str] = None
    city: Optional[str] = None
    bio: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class SignupBody(BaseModel):
    email: EmailStr
    password: str
    name: str


class LoginBody(BaseModel):
    email: EmailStr
    password: str


class GoogleSessionBody(BaseModel):
    session_token: str
    name: str
    email: EmailStr
    picture: Optional[str] = None


class ProfileBody(BaseModel):
    name: str
    skills: List[str]
    interests: List[str]
    goal: str
    stage: str
    time_commit: str
    city: str
    bio: Optional[str] = ""


class MentorMsgBody(BaseModel):
    content: str


class ChatMsgBody(BaseModel):
    content: str


# ───────────────────────── helpers ─────────────────────────


def _new_id(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:12]}"


def _hash_pw(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()


def _verify_pw(pw: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode(), hashed.encode())
    except Exception:
        return False


def _make_jwt(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "iat": datetime.now(timezone.utc),
        "exp": datetime.now(timezone.utc) + timedelta(days=30),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")


def _decode_jwt(token: str) -> Optional[str]:
    try:
        data = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        return data.get("sub")
    except Exception:
        return None


async def _current_user(authorization: Optional[str]) -> dict:
    """Authenticate by JWT (email/password) OR by session_token (Google)."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "Missing auth")
    token = authorization.split(" ", 1)[1].strip()

    # Try JWT first
    uid = _decode_jwt(token)
    if uid:
        user = await db.users.find_one({"user_id": uid}, {"_id": 0})
        if user:
            return user

    # Try session_token (Google)
    sess = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
    if sess:
        exp = sess.get("expires_at")
        if exp and exp.tzinfo is None:
            exp = exp.replace(tzinfo=timezone.utc)
        if exp and exp > datetime.now(timezone.utc):
            user = await db.users.find_one({"user_id": sess["user_id"]}, {"_id": 0})
            if user:
                return user

    raise HTTPException(401, "Invalid or expired token")


def _public_user(u: dict) -> dict:
    """Strip private fields."""
    return {
        "user_id": u["user_id"],
        "name": u["name"],
        "avatar": u.get("avatar"),
        "skills": u.get("skills", []),
        "interests": u.get("interests", []),
        "goal": u.get("goal"),
        "stage": u.get("stage"),
        "time_commit": u.get("time_commit"),
        "city": u.get("city"),
        "bio": u.get("bio"),
    }


def _conv_id(a: str, b: str) -> str:
    return ":".join(sorted([a, b]))


# ───────────────────────── matching ─────────────────────────

TIME_ORDER = {"1-2 hrs/day": 0, "3-4 hrs/day": 1, "Full-time": 2}
STAGE_ORDER = {"Just an idea": 0, "Building MVP": 1, "Have early users": 2, "Raising": 3}


def compatibility(me: dict, them: dict) -> dict:
    my_cats = {SKILL_META.get(s) for s in me.get("skills", []) if SKILL_META.get(s)}
    their_cats = {SKILL_META.get(s) for s in them.get("skills", []) if SKILL_META.get(s)}
    gaps = [c for c in their_cats if c not in my_cats]
    complement = min(1.0, len(gaps) / 2)

    my_int = set(me.get("interests", []))
    th_int = set(them.get("interests", []))
    inter = list(my_int & th_int)
    union = my_int | th_int
    interest_score = (len(inter) / len(union)) if union else 0

    t_gap = abs(TIME_ORDER.get(me.get("time_commit", ""), 1) - TIME_ORDER.get(them.get("time_commit", ""), 1))
    time_score = 1 if t_gap == 0 else 0.6 if t_gap == 1 else 0.25

    s_gap = abs(STAGE_ORDER.get(me.get("stage", ""), 0) - STAGE_ORDER.get(them.get("stage", ""), 0))
    stage_score = 1 if s_gap == 0 else 0.6 if s_gap == 1 else 0.3

    me_city, th_city = me.get("city"), them.get("city")
    loc_score = 1 if me_city == th_city else 0.5 if (me_city == "Remote" or th_city == "Remote") else 0.25

    raw = 0.35 * complement + 0.3 * interest_score + 0.15 * time_score + 0.1 * stage_score + 0.1 * loc_score
    return {"score": round(35 + raw * 64), "gaps": gaps, "shared_interests": inter}


def reasons_for(me: dict, them: dict, m: dict) -> List[str]:
    r = []
    if m["gaps"]:
        r.append(f"Brings {' + '.join(m['gaps'])} — skills your team is missing")
    if m["shared_interests"]:
        r.append(f"You both care about {', '.join(m['shared_interests'])}")
    if me.get("time_commit") and me.get("time_commit") == them.get("time_commit"):
        r.append(f"Both committing {me['time_commit']}")
    if me.get("city") and me.get("city") == them.get("city") and me.get("city") != "Remote":
        r.append(f"Both in {me['city']}")
    return r[:3]


# ───────────────────────── routes: auth ─────────────────────────


@api.post("/auth/signup")
async def signup(body: SignupBody):
    existing = await db.users.find_one({"email": body.email.lower()}, {"_id": 0})
    if existing:
        raise HTTPException(400, "Email already registered")
    uid = _new_id("user")
    user = {
        "user_id": uid,
        "email": body.email.lower(),
        "name": body.name.strip(),
        "auth_provider": "email",
        "password_hash": _hash_pw(body.password),
        "onboarded": False,
        "skills": [], "interests": [],
        "goal": None, "stage": None, "time_commit": None, "city": None, "bio": None,
        "created_at": datetime.now(timezone.utc),
    }
    await db.users.insert_one(user)
    return {"token": _make_jwt(uid), "user": _public_user(user) | {"email": user["email"], "onboarded": False}}


@api.post("/auth/login")
async def login(body: LoginBody):
    user = await db.users.find_one({"email": body.email.lower()}, {"_id": 0})
    if not user or not _verify_pw(body.password, user.get("password_hash", "")):
        raise HTTPException(401, "Invalid email or password")
    return {
        "token": _make_jwt(user["user_id"]),
        "user": _public_user(user) | {"email": user["email"], "onboarded": user.get("onboarded", False)},
    }


@api.post("/auth/google-session")
async def google_session(body: GoogleSessionBody, authorization: Optional[str] = Header(None)):
    """Accept a session_token from the Emergent OAuth flow.
    Verify by fetching session-data again (re-validates server-side), then upsert user."""
    # Verify with Emergent
    async with httpx.AsyncClient(timeout=20) as hc:
        r = await hc.get(
            "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
            headers={"X-Session-ID": body.session_token},
        )
        if r.status_code != 200:
            raise HTTPException(401, "Invalid Google session")
        data = r.json()

    email = (data.get("email") or body.email).lower()
    name = data.get("name") or body.name
    picture = data.get("picture") or body.picture
    server_session_token = data.get("session_token", body.session_token)

    existing = await db.users.find_one({"email": email}, {"_id": 0})
    if existing:
        uid = existing["user_id"]
        await db.users.update_one(
            {"user_id": uid},
            {"$set": {"name": name, "avatar": picture, "auth_provider": "google"}},
        )
        user = await db.users.find_one({"user_id": uid}, {"_id": 0})
    else:
        uid = _new_id("user")
        user = {
            "user_id": uid,
            "email": email,
            "name": name,
            "auth_provider": "google",
            "avatar": picture,
            "onboarded": False,
            "skills": [], "interests": [],
            "goal": None, "stage": None, "time_commit": None, "city": None, "bio": None,
            "created_at": datetime.now(timezone.utc),
        }
        await db.users.insert_one(user)

    # Persist session
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    await db.user_sessions.update_one(
        {"session_token": server_session_token},
        {"$set": {
            "session_token": server_session_token,
            "user_id": uid,
            "expires_at": expires_at,
            "created_at": datetime.now(timezone.utc),
        }},
        upsert=True,
    )
    return {
        "token": server_session_token,
        "user": _public_user(user) | {"email": user["email"], "onboarded": user.get("onboarded", False)},
    }


@api.get("/auth/me")
async def me(authorization: Optional[str] = Header(None)):
    user = await _current_user(authorization)
    return _public_user(user) | {"email": user["email"], "onboarded": user.get("onboarded", False)}


@api.post("/auth/logout")
async def logout(authorization: Optional[str] = Header(None)):
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ", 1)[1]
        await db.user_sessions.delete_one({"session_token": token})
    return {"ok": True}


# ───────────────────────── routes: profile ─────────────────────────


@api.put("/me/profile")
async def update_profile(body: ProfileBody, authorization: Optional[str] = Header(None)):
    user = await _current_user(authorization)
    await db.users.update_one(
        {"user_id": user["user_id"]},
        {"$set": {
            "name": body.name.strip(),
            "skills": body.skills,
            "interests": body.interests,
            "goal": body.goal,
            "stage": body.stage,
            "time_commit": body.time_commit,
            "city": body.city,
            "bio": body.bio or "",
            "onboarded": True,
        }},
    )
    fresh = await db.users.find_one({"user_id": user["user_id"]}, {"_id": 0})
    return _public_user(fresh) | {"email": fresh["email"], "onboarded": True}


# ───────────────────────── routes: matches ─────────────────────────


@api.get("/matches")
async def list_matches(authorization: Optional[str] = Header(None)):
    me_user = await _current_user(authorization)
    if not me_user.get("onboarded"):
        return {"matches": []}

    cursor = db.users.find(
        {"onboarded": True, "user_id": {"$ne": me_user["user_id"]}},
        {"_id": 0, "password_hash": 0},
    )
    others = await cursor.to_list(500)

    # Existing connection states for hiding/labelling
    conns = await db.connect_requests.find(
        {"$or": [
            {"from_user": me_user["user_id"]},
            {"to_user": me_user["user_id"]},
        ]},
        {"_id": 0},
    ).to_list(1000)
    state_map = {}
    for c in conns:
        other = c["to_user"] if c["from_user"] == me_user["user_id"] else c["from_user"]
        state_map[other] = c["status"]

    out = []
    for u in others:
        m = compatibility(me_user, u)
        out.append({
            **_public_user(u),
            "match_score": m["score"],
            "reasons": reasons_for(me_user, u, m),
            "connection_status": state_map.get(u["user_id"]),  # None | pending | accepted | rejected
        })
    out.sort(key=lambda x: x["match_score"], reverse=True)
    return {"matches": out}


# ───────────────────────── routes: connect ─────────────────────────


@api.post("/connect/{user_id}")
async def send_connect(user_id: str, authorization: Optional[str] = Header(None)):
    me_user = await _current_user(authorization)
    if user_id == me_user["user_id"]:
        raise HTTPException(400, "Cannot connect to self")
    target = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    if not target:
        raise HTTPException(404, "User not found")

    existing = await db.connect_requests.find_one(
        {"$or": [
            {"from_user": me_user["user_id"], "to_user": user_id},
            {"from_user": user_id, "to_user": me_user["user_id"]},
        ]},
        {"_id": 0},
    )
    if existing:
        return {"status": existing["status"], "request_id": existing["request_id"]}

    req_id = _new_id("req")
    await db.connect_requests.insert_one({
        "request_id": req_id,
        "from_user": me_user["user_id"],
        "to_user": user_id,
        "status": "pending",
        "created_at": datetime.now(timezone.utc),
    })
    return {"status": "pending", "request_id": req_id}


@api.get("/connect/requests")
async def list_requests(authorization: Optional[str] = Header(None)):
    me_user = await _current_user(authorization)
    incoming_raw = await db.connect_requests.find(
        {"to_user": me_user["user_id"], "status": "pending"}, {"_id": 0},
    ).to_list(500)
    outgoing_raw = await db.connect_requests.find(
        {"from_user": me_user["user_id"], "status": "pending"}, {"_id": 0},
    ).to_list(500)
    accepted_raw = await db.connect_requests.find(
        {"$or": [
            {"from_user": me_user["user_id"]},
            {"to_user": me_user["user_id"]},
        ], "status": "accepted"},
        {"_id": 0},
    ).to_list(500)

    async def hydrate(reqs, key):
        ids = [r[key] for r in reqs]
        users = {u["user_id"]: u for u in await db.users.find({"user_id": {"$in": ids}}, {"_id": 0, "password_hash": 0}).to_list(500)}
        out = []
        for r in reqs:
            u = users.get(r[key])
            if u:
                out.append({"request_id": r["request_id"], "user": _public_user(u), "created_at": r["created_at"].isoformat()})
        return out

    incoming = await hydrate(incoming_raw, "from_user")
    outgoing = await hydrate(outgoing_raw, "to_user")

    # accepted -> the OTHER user
    accepted = []
    other_ids = []
    for r in accepted_raw:
        other = r["to_user"] if r["from_user"] == me_user["user_id"] else r["from_user"]
        other_ids.append(other)
    users = {u["user_id"]: u for u in await db.users.find({"user_id": {"$in": other_ids}}, {"_id": 0, "password_hash": 0}).to_list(500)}
    for r in accepted_raw:
        other = r["to_user"] if r["from_user"] == me_user["user_id"] else r["from_user"]
        u = users.get(other)
        if u:
            accepted.append({"request_id": r["request_id"], "user": _public_user(u)})

    return {"incoming": incoming, "outgoing": outgoing, "accepted": accepted}


@api.post("/connect/{request_id}/accept")
async def accept_request(request_id: str, authorization: Optional[str] = Header(None)):
    me_user = await _current_user(authorization)
    req = await db.connect_requests.find_one({"request_id": request_id, "to_user": me_user["user_id"]}, {"_id": 0})
    if not req:
        raise HTTPException(404, "Request not found")
    await db.connect_requests.update_one({"request_id": request_id}, {"$set": {"status": "accepted"}})
    return {"ok": True}


@api.post("/connect/{request_id}/reject")
async def reject_request(request_id: str, authorization: Optional[str] = Header(None)):
    me_user = await _current_user(authorization)
    req = await db.connect_requests.find_one({"request_id": request_id, "to_user": me_user["user_id"]}, {"_id": 0})
    if not req:
        raise HTTPException(404, "Request not found")
    await db.connect_requests.update_one({"request_id": request_id}, {"$set": {"status": "rejected"}})
    return {"ok": True}


# ───────────────────────── routes: chat ─────────────────────────


async def _ensure_connected(a: str, b: str):
    r = await db.connect_requests.find_one(
        {"$or": [
            {"from_user": a, "to_user": b},
            {"from_user": b, "to_user": a},
        ], "status": "accepted"},
        {"_id": 0},
    )
    if not r:
        raise HTTPException(403, "Not connected")


@api.get("/chats/{user_id}/messages")
async def get_messages(user_id: str, since: Optional[str] = None, authorization: Optional[str] = Header(None)):
    me_user = await _current_user(authorization)
    await _ensure_connected(me_user["user_id"], user_id)
    q = {"conversation_id": _conv_id(me_user["user_id"], user_id)}
    if since:
        try:
            since_dt = datetime.fromisoformat(since.replace("Z", "+00:00"))
            q["created_at"] = {"$gt": since_dt}
        except Exception:
            pass
    msgs = await db.chat_messages.find(q, {"_id": 0}).sort("created_at", 1).to_list(1000)
    for m in msgs:
        m["created_at"] = m["created_at"].isoformat()
    return {"messages": msgs}


@api.post("/chats/{user_id}/messages")
async def send_message(user_id: str, body: ChatMsgBody, authorization: Optional[str] = Header(None)):
    me_user = await _current_user(authorization)
    await _ensure_connected(me_user["user_id"], user_id)
    msg = {
        "message_id": _new_id("msg"),
        "conversation_id": _conv_id(me_user["user_id"], user_id),
        "from_user": me_user["user_id"],
        "to_user": user_id,
        "content": body.content.strip()[:2000],
        "created_at": datetime.now(timezone.utc),
    }
    if not msg["content"]:
        raise HTTPException(400, "Empty message")
    await db.chat_messages.insert_one(dict(msg))
    msg["created_at"] = msg["created_at"].isoformat()
    msg.pop("_id", None)
    return msg


# ───────────────────────── routes: rooms ─────────────────────────


@api.get("/rooms")
async def list_rooms(authorization: Optional[str] = Header(None)):
    me_user = await _current_user(authorization)
    rooms = await db.rooms.find({}, {"_id": 0}).to_list(100)
    joined = {r["room_id"] for r in await db.room_members.find(
        {"user_id": me_user["user_id"]}, {"_id": 0}).to_list(100)}
    counts = {}
    for r in rooms:
        c = await db.room_members.count_documents({"room_id": r["id"]})
        counts[r["id"]] = r.get("base_members", 0) + c
    return {"rooms": [{**r, "members": counts[r["id"]], "joined": r["id"] in joined} for r in rooms]}


@api.post("/rooms/{room_id}/join")
async def join_room(room_id: str, authorization: Optional[str] = Header(None)):
    me_user = await _current_user(authorization)
    room = await db.rooms.find_one({"id": room_id}, {"_id": 0})
    if not room:
        raise HTTPException(404, "Room not found")
    await db.room_members.update_one(
        {"room_id": room_id, "user_id": me_user["user_id"]},
        {"$set": {"room_id": room_id, "user_id": me_user["user_id"], "joined_at": datetime.now(timezone.utc)}},
        upsert=True,
    )
    return {"joined": True}


@api.post("/rooms/{room_id}/leave")
async def leave_room(room_id: str, authorization: Optional[str] = Header(None)):
    me_user = await _current_user(authorization)
    await db.room_members.delete_one({"room_id": room_id, "user_id": me_user["user_id"]})
    return {"joined": False}


# ───────────────────────── routes: mentor ─────────────────────────


def _today_key() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


@api.get("/mentor")
async def mentor_state(authorization: Optional[str] = Header(None)):
    me_user = await _current_user(authorization)
    msgs = await db.mentor_messages.find(
        {"user_id": me_user["user_id"]}, {"_id": 0},
    ).sort("created_at", 1).to_list(200)
    for m in msgs:
        m["created_at"] = m["created_at"].isoformat()
    today = _today_key()
    used = await db.mentor_messages.count_documents(
        {"user_id": me_user["user_id"], "role": "user", "day": today},
    )
    return {"messages": msgs, "used": used, "limit": FREE_MENTOR_MSGS, "remaining": max(0, FREE_MENTOR_MSGS - used)}


@api.post("/mentor")
async def mentor_send(body: MentorMsgBody, authorization: Optional[str] = Header(None)):
    me_user = await _current_user(authorization)
    today = _today_key()
    used = await db.mentor_messages.count_documents(
        {"user_id": me_user["user_id"], "role": "user", "day": today},
    )
    if used >= FREE_MENTOR_MSGS:
        raise HTTPException(429, "Daily limit reached")

    content = body.content.strip()
    if not content:
        raise HTTPException(400, "Empty message")

    now = datetime.now(timezone.utc)
    user_msg = {
        "message_id": _new_id("mm"),
        "user_id": me_user["user_id"],
        "role": "user",
        "content": content[:2000],
        "day": today,
        "created_at": now,
    }
    await db.mentor_messages.insert_one(dict(user_msg))

    # Build context from history
    history = await db.mentor_messages.find(
        {"user_id": me_user["user_id"]}, {"_id": 0},
    ).sort("created_at", 1).to_list(40)

    sys = (
        f"You are a sharp, practical startup mentor for early Indian builders. "
        f"The user is {me_user.get('name')}, skilled in {', '.join(me_user.get('skills', []))}, "
        f"interested in {', '.join(me_user.get('interests', []))}, stage: {me_user.get('stage')}. "
        f"Keep answers SHORT (under 120 words), concrete and action-oriented. Plain language, no fluff."
    )
    session_id = f"mentor-{me_user['user_id']}"
    chat = LlmChat(api_key=EMERGENT_LLM_KEY, session_id=session_id, system_message=sys).with_model(
        "anthropic", "claude-sonnet-4-5-20250929"
    )

    # Feed prior history (excluding the one we just stored, which we'll send as the latest user message)
    prior = history[:-1] if history and history[-1]["message_id"] == user_msg["message_id"] else history
    for h in prior:
        try:
            await chat.send_message(UserMessage(text=h["content"])) if h["role"] == "user" else None
        except Exception:
            pass

    try:
        ai_text = await chat.send_message(UserMessage(text=content))
    except Exception:
        logging.exception("Mentor LLM error")
        ai_text = "Network hiccup — try again in a moment."

    ai_msg = {
        "message_id": _new_id("mm"),
        "user_id": me_user["user_id"],
        "role": "assistant",
        "content": str(ai_text),
        "day": today,
        "created_at": datetime.now(timezone.utc),
    }
    await db.mentor_messages.insert_one(dict(ai_msg))

    user_msg["created_at"] = user_msg["created_at"].isoformat()
    ai_msg["created_at"] = ai_msg["created_at"].isoformat()
    user_msg.pop("_id", None)
    ai_msg.pop("_id", None)
    return {
        "user_message": user_msg,
        "assistant_message": ai_msg,
        "used": used + 1,
        "limit": FREE_MENTOR_MSGS,
        "remaining": max(0, FREE_MENTOR_MSGS - used - 1),
    }


# ───────────────────────── routes: meta ─────────────────────────


@api.get("/meta")
async def meta():
    return {
        "skills": list(SKILL_META.keys()),
        "skill_categories": SKILL_META,
        "interests": ["AI", "SaaS", "FinTech", "EdTech", "Gaming", "Space", "Robotics", "HealthTech", "Climate", "Creator Economy", "E-commerce", "Web3"],
        "goals": ["Build a startup", "Find a cofounder", "Join a team", "Learn by building"],
        "stages": ["Just an idea", "Building MVP", "Have early users", "Raising"],
        "times": ["1-2 hrs/day", "3-4 hrs/day", "Full-time"],
        "cities": ["Jaipur", "Delhi", "Bangalore", "Mumbai", "Pune", "Hyderabad", "Kota", "Indore", "Remote"],
    }


@api.get("/health")
async def health():
    return {"status": "ok"}


# ───────────────────────── startup: indexes + seed ─────────────────────────


@app.on_event("startup")
async def startup_event():
    await db.users.create_index("user_id", unique=True)
    await db.users.create_index("email", unique=True)
    await db.user_sessions.create_index("session_token", unique=True)
    await db.user_sessions.create_index("expires_at", expireAfterSeconds=0)
    await db.connect_requests.create_index("request_id", unique=True)
    await db.connect_requests.create_index([("from_user", 1), ("to_user", 1)])
    await db.chat_messages.create_index([("conversation_id", 1), ("created_at", 1)])
    await db.mentor_messages.create_index([("user_id", 1), ("created_at", 1)])
    await db.room_members.create_index([("room_id", 1), ("user_id", 1)], unique=True)

    # Seed rooms (idempotent)
    for r in ROOMS_SEED:
        await db.rooms.update_one(
            {"id": r["id"]},
            {"$set": {
                "id": r["id"], "name": r["name"], "emoji": r["emoji"],
                "desc": r["desc"], "base_members": r["members"],
            }},
            upsert=True,
        )

    # Seed demo users (idempotent)
    for d in DEMO_USERS_SEED:
        existing = await db.users.find_one({"email": d["email"]}, {"_id": 0})
        if existing:
            continue
        uid = _new_id("user")
        await db.users.insert_one({
            "user_id": uid,
            "email": d["email"],
            "name": d["name"],
            "auth_provider": "email",
            "password_hash": _hash_pw("demo1234"),
            "onboarded": True,
            "skills": d["skills"],
            "interests": d["interests"],
            "goal": d["goal"],
            "stage": d["stage"],
            "time_commit": d["time_commit"],
            "city": d["city"],
            "bio": d["bio"],
            "created_at": datetime.now(timezone.utc),
        })
    logging.info("Cofound backend ready.")


@app.on_event("shutdown")
async def shutdown_event():
    client.close()


app.include_router(api)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
