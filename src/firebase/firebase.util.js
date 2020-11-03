 import firebase from 'firebase/app'
 import 'firebase/firestore';
 import 'firebase/auth'



 var config = {
     apiKey: "AIzaSyDZ-5EaTJPD5j72VqhjJi7PBpeU-6uNlYU",
     authDomain: "celebs-db-3371a.firebaseapp.com",
     databaseURL: "https://celebs-db-3371a.firebaseio.com",
     projectId: "celebs-db-3371a",
     storageBucket: "celebs-db-3371a.appspot.com",
     messagingSenderId: "1032058214977",
     appId: "1:1032058214977:web:f91616a2706ae65c2204c0",
     measurementId: "G-ZMP1SYNGMY"
 };


 export const createUserProfileDocument = async(userAuth, additionalData) => {
     if (!userAuth) return;

     const userRef = firestore.doc(`users/${userAuth.uid}`);

     const snapShot = await userRef.get()

     if (!snapShot.exists) {
         const { displayName, email } = userAuth
         const createdAt = new Date()

         try {
             await userRef.set({
                 displayName,
                 email,
                 createdAt,
                 ...additionalData

             })
         } catch (error) {
             console.log('error creating user', error.message);
         }
     }

     return userRef;


 }


 firebase.initializeApp(config);
 export const auth = firebase.auth();

 export const firestore = firebase.firestore();

 const provider = new firebase.auth.GoogleAuthProvider();

 provider.setCustomParameters({
     prompt: 'select_account'
 })

 export const signInWithGoogle = () => auth.signInWithPopup(provider);
 export default firebase;