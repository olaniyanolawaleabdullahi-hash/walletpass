const { initializeApp } = require('firebase/app');
const { getFirestore, collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, where } = require('firebase/firestore');

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

async function getAllMembers(merchantId) {
  try {
    let q;
    if (merchantId) {
      q = query(collection(db, 'members'), where('merchantId', '==', merchantId));
    } else {
      q = collection(db, 'members');
    }
    const querySnapshot = await getDocs(q);
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

async function addMerchant(merchantData) {
  try {
    const docRef = await addDoc(collection(db, 'merchants'), merchantData);
    console.log('Merchant added with ID:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('Error adding merchant:', error);
    throw error;
  }
}

async function getAllMerchants() {
  try {
    const querySnapshot = await getDocs(collection(db, 'merchants'));
    const merchants = [];
    querySnapshot.forEach((doc) => {
      merchants.push({ id: doc.id, ...doc.data() });
    });
    return merchants;
  } catch (error) {
    console.error('Error getting merchants:', error);
    throw error;
  }
}

async function getMerchantByEmail(email) {
  try {
    const q = query(collection(db, 'merchants'), where('email', '==', email));
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) return null;
    const doc = querySnapshot.docs[0];
    return { id: doc.id, ...doc.data() };
  } catch (error) {
    console.error('Error getting merchant:', error);
    throw error;
  }
}

module.exports = { db, addMember, getAllMembers, updateMember, addMerchant, getAllMerchants, getMerchantByEmail };