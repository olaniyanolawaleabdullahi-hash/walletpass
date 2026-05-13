const express = require('express');
const path = require('path');
const { generatePass } = require('./generatePass');
const { addMember, getAllMembers, updateMember, addMerchant, getAllMerchants, getMerchantByEmail } = require('./firebase');
const { generateGoogleWalletLink } = require('./googleWallet');
const app = express();
const port = 3000;

app.use(express.json());

// MAIN PAGES
app.get('/', (req, res) => res.sendFile(path.resolve('dashboard.html')));
app.get('/login', (req, res) => res.sendFile(path.resolve('login.html')));
app.get('/signup', (req, res) => res.sendFile(path.resolve('signup.html')));
app.get('/dashboard', (req, res) => res.sendFile(path.resolve('dashboard.html')));
app.get('/merchant-dashboard', (req, res) => res.sendFile(path.resolve('merchant-dashboard.html')));
app.get('/members-page', (req, res) => res.sendFile(path.resolve('members.html')));
app.get('/issue', (req, res) => res.sendFile(path.resolve('issue.html')));
app.get('/settings', (req, res) => res.sendFile(path.resolve('settings.html')));
app.get('/superadmin', (req, res) => res.sendFile(path.resolve('superadmin.html')));
app.get('/stampcard', (req, res) => res.sendFile(path.resolve('stampcard.html')));
app.get('/checkin', (req, res) => res.sendFile(path.resolve('checkin.html')));

app.post('/members/checkin', async (req, res) => {
  try {
    const { memberId } = req.body;
    const members = await getAllMembers();
    const member = members.find(m => m.memberId === memberId);
    if(!member) return res.status(404).json({ error: 'Member not found' });
    const newStamps = (member.stampsCollected || 0) + 1;
    await updateMember(member.id, { stampsCollected: newStamps });
    const completed = newStamps >= (member.totalStamps || 10);
    res.json({ success: true, stampsCollected: newStamps, totalStamps: member.totalStamps || 10, completed, memberName: member.name });
  } catch(error){
    res.status(500).json({ error: 'Failed to add stamp' });
  }
});
// AUTH
app.post('/auth/check-merchant', async (req, res) => {
  try {
    const { email } = req.body;
    const merchant = await getMerchantByEmail(email);
    if (merchant) {
      res.json({ isMerchant: true, merchant });
    } else {
      res.json({ isMerchant: false });
    }
  } catch (error) {
    res.json({ isMerchant: false });
  }
});

// MERCHANT SIGNUP
app.post('/merchant/signup', async (req, res) => {
  try {
    const { businessName, ownerName, email, phone, bizType, status, plan, createdAt } = req.body;
    const merchantData = { businessName, ownerName, email, phone: phone||'', bizType: bizType||'other', status: status||'active', plan: plan||'starter', createdAt: createdAt||new Date().toISOString() };
    const merchantId = await addMerchant(merchantData);
    res.json({ success: true, merchantId });
  } catch(error) {
    res.status(500).json({ error: error.message });
  }
});

// ADMIN
app.get('/admin/merchants', async (req, res) => {
  try {
    const merchants = await getAllMerchants();
    const members = await getAllMembers();
    res.json({ merchants, totalMembers: members.length });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get merchants' });
  }
});

app.post('/admin/merchants/create', async (req, res) => {
  try {
    const { businessName, email, phone, plan, status, createdAt } = req.body;
    const merchantData = { businessName, email, phone: phone||'', plan: plan||'starter', status: status||'active', createdAt: createdAt||new Date().toISOString() };
    const merchantId = await addMerchant(merchantData);
    res.json({ success: true, merchantId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/admin/merchants/delete', async (req, res) => {
  try {
    const { merchantId } = req.body;
    const { db } = require('./firebase');
    const { doc, deleteDoc } = require('firebase/firestore');
    await deleteDoc(doc(db, 'merchants', merchantId));
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete merchant' });
  }
});

// MEMBERS
app.get('/members', async (req, res) => {
  try {
    const merchantId = req.query.merchantId || null;
    const members = await getAllMembers(merchantId);
    res.json(members);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get members' });
  }
});

app.post('/members/add', async (req, res) => {
  try {
    const id = await addMember(req.body);
    res.json({ success: true, id });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add member' });
  }
});

app.post('/members/delete', async (req, res) => {
  try {
    const { memberId } = req.body;
    const { db } = require('./firebase');
    const { doc, deleteDoc } = require('firebase/firestore');
    await deleteDoc(doc(db, 'members', memberId));
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete member' });
  }
});

app.post('/members/update', async (req, res) => {
  try {
    const { memberId, updatedData } = req.body;
    await updateMember(memberId, updatedData);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update member' });
  }
});

// STAMP CARD REGISTRATION
app.post('/register/stampcard', async (req, res) => {
  try {
    const { name, email, phone, businessName, merchantId, reward, totalStamps, walletType, bgColor, textColor } = req.body;
    const members = await getAllMembers();
    const nextNumber = String(members.length + 1).padStart(3, '0');
    const memberId = `STAMP${nextNumber}`;
    const memberData = {
      name, email, phone: phone||'', memberId,
      merchantId: merchantId||'',
      businessName: businessName||'LoyaltyPass',
      stampsCollected: 0,
      totalStamps: totalStamps||10,
      reward: reward||'free item',
      cardType: 'stamp',
      bgColor: bgColor||'#000000',
      textColor: textColor||'#FFD700',
      expiryDate: '12/2027',
      registeredAt: new Date().toISOString()
    };
    await addMember(memberData);
    if(walletType === 'google'){
      const googleWalletLink = await generateGoogleWalletLink({
        id: memberId,
        businessName: memberData.businessName,
        name: memberData.name,
        points: 0,
        loyaltyStatus: `0/${memberData.totalStamps} stamps`,
        expiryDate: memberData.expiryDate
      });
      res.json({ success: true, walletUrl: googleWalletLink });
    } else {
      res.json({ success: true, walletUrl: '/card/download?id=' + memberId });
    }
  } catch(error) {
    res.status(500).json({ error: 'Failed to register stamp card' });
  }
});

// CARD DOWNLOAD
app.get('/card/download', async (req, res) => {
  try {
    const members = await getAllMembers();
    const member = members.find(m => m.memberId === req.query.id);
    if(!member) return res.status(404).json({ error: 'Member not found' });
    const passPath = await generatePass({
      id: member.memberId,
      businessName: member.businessName,
      name: member.name,
      points: member.stampsCollected || member.points || 0,
      loyaltyStatus: member.loyaltyStatus || 'Member',
      expiryDate: member.expiryDate
    });
    res.setHeader('Content-Type', 'application/vnd.apple.pkpass');
    res.setHeader('Content-Disposition', 'attachment; filename=loyaltycard.pkpass');
    res.sendFile(path.resolve(passPath));
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate pass' });
  }
});

app.get('/card/google', async (req, res) => {
  try {
    const members = await getAllMembers();
    const member = members.find(m => m.memberId === req.query.id);
    if(!member) return res.status(404).json({ error: 'Member not found' });
    const googleWalletLink = await generateGoogleWalletLink({
      id: member.memberId,
      businessName: member.businessName,
      name: member.name,
      points: member.stampsCollected || member.points || 0,
      loyaltyStatus: member.loyaltyStatus || 'Member',
      expiryDate: member.expiryDate
    });
    res.redirect(googleWalletLink);
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate Google Wallet link' });
  }
});

app.listen(port, () => {
  console.log(`WalletPass server running on http://localhost:${port}`);
});