const { initializeApp } = require('firebase/app');
const { getFirestore, collection, addDoc, getDocs, doc, updateDoc, deleteDoc } = require('firebase/firestore');
const firebaseConfig = {
  apiKey: "AIzaSyBMOR53eRC_eafMewxKuiDRFSyzMyil5f0",
  authDomain: "walletpass-admin.firebaseapp.com",
  projectId: "walletpass-admin",
  storageBucket: "walletpass-admin.firebasestorage.app",
  messagingSenderId: "643004300341",
  appId: "1:643004300341:web:4080b5a008d72d145e857c"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function addMember(memberData) {
  try {
    const docRef = await addDoc(collection(db, 'members'), memberData);
    console.log('Member added with ID:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('Error adding member:', error);
    throw error;
  }
}

async function getAllMembers() {
  try {
    const querySnapshot = await getDocs(collection(db, 'members'));
    const members = [];
    querySnapshot.forEach((doc) => {
      members.push({ id: doc.id, ...doc.data() });
    });
    return members;
  } catch (error) {
    console.error('Error getting members:', error);
    throw error;
  }
}

async function updateMember(memberId, updatedData) {
  try {
    const memberRef = doc(db, 'members', memberId);
    await updateDoc(memberRef, updatedData);
    console.log('Member updated successfully');
  } catch (error) {
    console.error('Error updating member:', error);
    throw error;
  }
}

module.exports = { db, addMember, getAllMembers, updateMember };