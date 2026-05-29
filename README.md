# Pharmacy Web App

React + Vite + TypeScript + Firebase pharmacy management MVP.

## Features

- Arabic / English UI
- Dashboard
- Inventory management: add, edit, delete medicines
- POS selling screen
- Discount and payment method
- Firebase Firestore live data
- Invoices list
- Invoice details modal
- PDF invoice printing
- Low stock and expiring medicine alerts

## Run locally

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Firebase setup

Open `src/firebase.ts` and replace the Firebase config with your project config.

For testing only, Firestore Rules can be:

```js
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

Do not use these rules for a real client. Add login and secure rules before selling.

## GitHub Pages

This project has `base: '/Pharmacy-web-app/'` in `vite.config.ts`.
If your repository name is different, update that value.
