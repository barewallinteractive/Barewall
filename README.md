# Barewall Interactive — Local Game Studio Operations Demo

A professional internal game-studio operations dashboard with **Admin** and **Team Member** roles.

## Local demo

```bash
npm install
npm run dev
```

Open the localhost URL shown by Vite.

### Demo logins

| Role | Email | Password |
|---|---|---|
| Admin | admin@forgeops.demo | admin123 |
| 3D Artist | maya@forgeops.demo | artist123 |
| Programmer | arjun@forgeops.demo | programmer123 |
| Level Designer | noah@forgeops.demo | level123 |
| Animator | priya@forgeops.demo | animator123 |

## Permissions

### Admin
- Login/logout
- View all team members and department hours
- Create team member accounts by email
- Set team member login password in local demo mode
- Assign tasks to team members
- Choose priority and due date
- View team member status and progress notes
- Cannot be impersonated by team members

### Team Member
- Individual login/logout
- See only tasks assigned to them
- Change assigned task status: Not Started / In Progress / Completed / For Review
- Add progress notes, blockers and delivery messages
- Start/stop their work timer
- See team and department production hours
- Cannot create or assign tasks
- Cannot create another team member or admin account

## Data

Local demo data is stored in browser `localStorage`, so you can test the full workflow without Firebase.

## Production

Configure `.env` with Firebase values to switch the app to Firebase Authentication + Firestore. The production flow should use Firebase Authentication for identity and Firestore security rules for authorization. Do not store plaintext passwords in Firestore in a real deployment; use an approved authentication/invitation flow.


### If the browser has old broken demo data
The app now validates the demo admin account and includes an error recovery screen. If you still see an old state, open DevTools Console and run `localStorage.clear()` once, then refresh.

## Company branding
The interface is branded as **Barewall Interactive**. Place the company logo file named exactly `LOGO ALONE.png` inside the `public/` folder. The UI includes a fallback mark if the logo file is not present.

## Firebase production mode

The current build includes a production path using Firebase Authentication, Firestore, Firebase Hosting, and an admin-only callable Cloud Function for creating Team Member accounts. See `FIREBASE_SETUP.md` for the complete setup and deployment sequence.

In production, Team Member passwords are managed by Firebase Authentication and are never stored in Firestore.

## Google AI Studio

This project is prepared for import into Google AI Studio Build mode and deployment to Cloud Run. See `AI_STUDIO_DEPLOYMENT.md`.
