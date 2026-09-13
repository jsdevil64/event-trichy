EVENT HUB - FIXED RESPONSIVE BUILD

This build keeps the professional responsive CSS and removes the Firestore composite-index dependency from category/admin provider queries.

IMPORTANT FIREBASE SETUP
1. Open Firebase Console -> Project settings -> Your apps -> Web app.
2. Copy the CURRENT Web SDK configuration and replace firebaseConfig in js/firebase.js.
3. Do not type the API key manually. Copy it directly from Firebase Console.
4. Authentication -> Sign-in method -> enable Email/Password.
5. Firestore Database -> create the database.
6. Publish the included firestore.rules after reviewing them.
7. Create an admin Firebase Auth account. Then create:
   admins/{AUTH_UID}
   with: active: true
8. The customer enquiry destination is the configured WhatsApp number in js/firebase.js.

If the browser still shows auth/api-key-not-valid after copying the current config, the API key itself is invalid/restricted/deleted in Google Cloud/Firebase and must be replaced with a newly copied valid Web API key.

NEW FEATURES IN THIS VERSION
- Password eye buttons are available on provider register/login and admin login/register.
- Provider dashboard has a monthly work calendar. Click dates to mark/unmark Work, then Save Work Dates.
- Category pages have an Event Date picker below the search box. Selecting a date hides providers who marked that date as Work.
- Enquiries now also save the selected Event Date and include it in the pre-filled WhatsApp message.
- Existing providers without busyDates are treated as available.

ADMIN REGISTER NOTE
- Admin registration is restricted by Firestore rules to the owner phone 8939717405 for the bootstrap account.
- The visible registration key is only a UI gate, not a true secret. For stronger security or multiple admins, use Firebase Admin SDK/Cloud Functions to provision admins.
