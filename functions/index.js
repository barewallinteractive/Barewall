const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

initializeApp();
const db = getFirestore();
const auth = getAuth();

exports.createTeamMemberAccount = onCall(async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'You must be signed in.');

  const adminSnap = await db.collection('members').doc(request.auth.uid).get();
  if (!adminSnap.exists || adminSnap.data().role !== 'admin') {
    throw new HttpsError('permission-denied', 'Only administrators can create team member accounts.');
  }

  const { name, email, department, password } = request.data || {};
  const cleanEmail = String(email || '').trim().toLowerCase();
  const cleanName = String(name || '').trim();
  const cleanDepartment = String(department || '').trim();
  const cleanPassword = String(password || '');

  if (!cleanName || !cleanEmail || !cleanDepartment) {
    throw new HttpsError('invalid-argument', 'Name, email and department are required.');
  }
  if (cleanPassword.length < 6) {
    throw new HttpsError('invalid-argument', 'Temporary password must be at least 6 characters.');
  }

  const existing = await db.collection('members').where('email', '==', cleanEmail).limit(1).get();
  if (!existing.empty) {
    throw new HttpsError('already-exists', 'That email is already in the team.');
  }

  let created;
  try {
    created = await auth.createUser({
      email: cleanEmail,
      password: cleanPassword,
      displayName: cleanName,
      emailVerified: false
    });
  } catch (err) {
    if (err.code === 'auth/email-already-exists') {
      throw new HttpsError('already-exists', 'A login account already exists for that email.');
    }
    throw new HttpsError('internal', err.message || 'Could not create the login account.');
  }

  try {
    await db.collection('members').doc(created.uid).set({
      name: cleanName,
      email: cleanEmail,
      department: cleanDepartment,
      role: 'member',
      totalSeconds: 0,
      avatar: cleanName.split(/\s+/).map(x => x[0]).slice(0, 2).join('').toUpperCase(),
      createdAt: FieldValue.serverTimestamp(),
      createdBy: request.auth.uid
    });
  } catch (err) {
    await auth.deleteUser(created.uid).catch(() => {});
    throw new HttpsError('internal', 'The login was created but the team profile could not be saved.');
  }

  return { uid: created.uid, name: cleanName, email: cleanEmail, temporaryPassword: cleanPassword };
});
