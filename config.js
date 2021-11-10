import firebase from 'firebase'
require('@firebase/firestore')

const firebaseConfig = {
    apiKey: "AIzaSyCWWAz1B1e4ujxek-mTAHYXjqNuCfccVMI",
    authDomain: "wily-app-d5644.firebaseapp.com",
    projectId: "wily-app-d5644",
    storageBucket: "wily-app-d5644.appspot.com",
    messagingSenderId: "1067309548037",
    appId: "1:1067309548037:web:03d72a1e06c1ed2860926c"
  };
  
firebase.initializeApp(firebaseConfig)

export default firebase.firestore()