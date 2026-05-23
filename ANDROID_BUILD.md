# Cofound — Android Studio Build Guide

This is an **Expo (React Native) app**. To open it in Android Studio you
first have to **generate the native `android/` Gradle project** with
`expo prebuild`. The `android/` folder is intentionally not committed —
it's a generated artifact.

---

## 1. Prerequisites (one-time, on your machine)

| Tool | Version |
|------|---------|
| Node.js | 20 LTS |
| Yarn | 1.22+ (`npm i -g yarn`) |
| Java | **JDK 17** (e.g. Temurin 17) |
| Android Studio | Hedgehog (2023.1.1) or newer |
| Android SDK | API **34** + build-tools **34.0.0** |
| `ANDROID_HOME` | Set to your SDK path |

Verify:
```bash
node -v   # v20.x
java -version  # 17.x
echo $ANDROID_HOME
```

---

## 2. Clone & install

```bash
git clone <your-emergent-repo-url> cofound
cd cofound/frontend
yarn install
```

---

## 3. Point the app at a backend

Edit `frontend/.env`:

```env
# Use your DEPLOYED backend URL (Emergent preview URL won't work in a standalone APK):
EXPO_PUBLIC_BACKEND_URL=https://your-cofound-backend.example.com

# OR, while developing on a phone over WiFi, your LAN IP:
# EXPO_PUBLIC_BACKEND_URL=http://192.168.1.42:8001
```

If you don't have a backend yet, deploy `/backend` first — see the
`Backend setup` section below.

---

## 4. Generate the native `android/` project

```bash
cd frontend
npx expo prebuild --platform android --clean
```

What this does:
- Reads `app.json` (package name `com.cofound.app`, permissions, splash, icons, plugins)
- Generates `frontend/android/` — a complete Gradle project
- Installs all native modules (expo-router, expo-secure-store, expo-web-browser, expo-blur, …)

You only re-run this when you change `app.json` or add/remove native deps.

---

## 5. Open in Android Studio

1. Launch Android Studio
2. **Open** → select **`frontend/android`** (NOT `frontend/`)
3. Wait for the first Gradle sync (5–10 min the first time)
4. Pick an emulator or plug in a device (USB debugging on)
5. Press the ▶ **Run** button

---

## 6. Build a release APK

### Option A — from the terminal
```bash
cd frontend/android
./gradlew assembleRelease
# Output: app/build/outputs/apk/release/app-release.apk
```

### Option B — from Android Studio
**Build → Generate Signed Bundle / APK → APK → release**

You'll need to create a keystore the first time (Android Studio guides you).

### Option C — easiest path: Emergent Publish button
Skip Android Studio entirely. Click **Publish** in the Emergent UI →
choose Android → get a signed APK/AAB. Recommended unless you specifically
need to debug native code.

---

## 7. Backend setup (FastAPI + MongoDB)

```bash
cd backend
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

Create `backend/.env`:
```env
MONGO_URL=mongodb://localhost:27017      # or your Atlas URI
DB_NAME=cofound
JWT_SECRET=replace-with-a-long-random-string
EMERGENT_LLM_KEY=sk-emergent-...         # for AI Mentor (Claude)
```

Run it:
```bash
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

The 14 demo users and 8 startup rooms are seeded automatically on first
startup. Demo login: `aarav@cofound.demo` / `demo1234`.

---

## 8. Common errors & fixes

| Error | Fix |
|-------|-----|
| `SDK location not found` | Set `ANDROID_HOME` env var, restart terminal |
| `Could not determine the dependencies of task` | `cd android && ./gradlew --stop && ./gradlew clean` |
| `Unable to resolve module …` | `cd frontend && rm -rf node_modules .expo && yarn install && npx expo prebuild --clean` |
| App opens but blank / "Network request failed" | `EXPO_PUBLIC_BACKEND_URL` not set or unreachable from the phone |
| Google sign-in opens browser but never returns | The Emergent-managed Google flow needs the app's redirect scheme — `cofound://auth` is already configured via `app.json.scheme`. For a standalone production APK you'll want your own Google OAuth client; tell the agent to wire that up. |
| Build error about Java version | Switch to **JDK 17** — newer Java causes Gradle plugin failures |

---

## 9. App identifiers (already set in `app.json`)

- **Package name**: `com.cofound.app`
- **iOS bundle ID**: `com.cofound.app`
- **App name**: `Cofound`
- **URL scheme**: `cofound://`
- **Version**: `1.0.0` (`versionCode 1`)

Bump `version` (display) and `versionCode` (must be a higher integer)
in `app.json` for every Play Store upload, then re-run `expo prebuild`.

---

## 10. What's NOT in this app (clean-room minimum permissions)

The app declares **only** `INTERNET` and `ACCESS_NETWORK_STATE`. Camera,
microphone, location are explicitly **blocked** in `app.json` so Google
Play Console doesn't flag them. If you later add a feature that needs
one (e.g. profile photo capture), remove it from `blockedPermissions`
and follow the permissions playbook in `/app/handle_permissions_contract`
of the system docs.
