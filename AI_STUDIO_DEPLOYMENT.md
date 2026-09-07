# Barewall Interactive — Google AI Studio deployment

This project is prepared to run as a standard React/Vite application in Google AI Studio and deploy as a Cloud Run service.

## Recommended AI Studio workflow

1. Open Google AI Studio Build mode.
2. Import this project (or import the GitHub repository after pushing it).
3. Ask the AI Studio agent:

   > This is the Barewall Interactive production web app. Keep the existing UI and functionality. Verify the Vite build, make sure the app runs on Cloud Run using the PORT environment variable, and do not replace Firebase Authentication or Firestore with mock data. Fix any build/deployment issues you find.

4. Run the app in the preview and test login, dashboard, tasks, team, and time pages.
5. Use **Deploy to Cloud Run** when the preview is working.

Google AI Studio Build supports importing existing GitHub projects and deploying apps to Cloud Run. See the official docs: https://ai.google.dev/gemini-api/docs/aistudio-build-mode

## Firebase production configuration

The application uses Firebase Authentication and Firestore for production data. The Firebase web configuration belongs in the environment variables used by the Vite build:

- VITE_FIREBASE_API_KEY
- VITE_FIREBASE_AUTH_DOMAIN
- VITE_FIREBASE_PROJECT_ID
- VITE_FIREBASE_STORAGE_BUCKET
- VITE_FIREBASE_MESSAGING_SENDER_ID
- VITE_FIREBASE_APP_ID

These Firebase Web SDK configuration values are client configuration, not Firebase Admin service-account credentials. Never put a Firebase service-account private key in the frontend or in source control.

The `functions/` directory contains the secure Firebase callable function used by an Admin to create team-member accounts. Deploy that Firebase backend separately with Firebase CLI when you are ready for real member creation. Cloud Run hosts the website; Firebase remains the authentication/database backend.

## Important

Do not enable paid Gemini API features just to run this app. The app does not require Gemini API calls for its core dashboard functionality.
