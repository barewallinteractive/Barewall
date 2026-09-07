# Barewall Interactive — Firebase Spark Setup

This project uses a **100% Firebase Spark (Free Tier) compatible invitation flow**.
It **does not require Cloud Functions, Cloud Billing, or any paid backend services**.

---

## 1. Create a Firebase Project (Spark Plan)

1. Go to [Firebase Console](https://console.firebase.google.com/) and create a project on the free Spark plan.
2. In **Authentication** → **Sign-in method**:
   - Enable **Email/Password**.
3. In **Firestore Database**:
   - Create a database in production mode.
4. In **Project Settings** → **General**:
   - Add a Web App and copy the config credentials into `.env`.

---

## 2. Environment Configuration

Create a `.env` file from `.env.example`:

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

---

## 3. Create the First Admin

1. Sign up the first administrator in Firebase Authentication using their work email and a secure password.
2. In Firestore, create a document in the `members` collection:
   - **Collection ID**: `members`
   - **Document ID**: The Firebase Auth user's `UID`
   - **Fields**:
     - `name`: `"Alex Morgan"` (string)
     - `email`: `"admin@yourstudio.com"` (string, lowercase)
     - `department`: `"Production"` (string)
     - `role`: `"admin"` (string)
     - `totalSeconds`: `0` (number)
     - `avatar`: `"AM"` (string)
     - `createdAt`: server timestamp

---

## 4. Deploy Security Rules & Hosting

Install the Firebase CLI if needed:

```bash
npm install -g firebase-tools
firebase login
firebase use --add
```

Build and deploy:

```bash
npm run build
firebase deploy --only firestore,hosting
```

---

## 5. How the Spark Invitation Flow Works

1. **Admin Invites by Email**:
   - The admin clicks **"Invite by email"** on the Team screen.
   - Enters full name, work email, and department.
   - A pending document is created in Firestore `members` with:
     `{ name, email, department, role: "member", invited: true, claimed: false, invitedBy: adminUid }`.
   - **No password is generated or stored by the admin**.

2. **Invited Member Activates Account**:
   - On the login screen, the invited member clicks **"First time? Create your invited team account"**.
   - They enter their invited email address and choose their own password.
   - The app verifies the pending invitation in Firestore `members`, creates their `members/{newAuthUid}` profile, and marks the pending invitation as claimed (`claimed: true`, `claimedBy: auth.uid`, `claimedAt: serverTimestamp()`).
   - Any registration attempt without a valid pending invitation is automatically rejected and removed.

3. **Firestore Security Rules**:
   - Only admins can create invitations.
   - Authenticated invited users can safely claim ONLY their own matching pending invitation document (`resource.data.email.lower() == request.auth.token.email.lower()`).
   - Invited users cannot alter name, email, department, or role on the invitation document (restricted strictly to `['claimed', 'claimedBy', 'claimedAt']`).
   - Only the invited user can create their member profile matching their authenticated UID and token email.
   - Regular members can only update their own progress and tasks.
