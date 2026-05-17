require('dotenv').config();
const express = require('express');
const path = require('path');
const { generatePass } = require('./generatePass');
const { addMember, getAllMembers, updateMember, addMerchant, getAllMerchants, getMerchantByEmail } = require('./firebase');
const { generateGoogleWalletLink } = require('./googleWallet');
const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');

const app = express();
const port = 3000;
const COOKIE_SECRET = process.env.COOKIE_SECRET || 'change-this-in-production';
const JWT_SECRET = process.env.JWT_SECRET || 'change-this-in-production';

function generateStampToken(memberId, businessId) {
  return jwt.sign(
    { memberId, businessId, nonce: uuidv4() },
    JWT_SECRET,
    { expiresIn: '5m' }
  );
}

function verifyStampToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch(e) {
    return null;
  }
}

app.use(express.json());
app.use(cookieParser(COOKIE_SECRET));

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
app.get('/card-setup', (req, res) => res.sendFile(path.resolve('card-setup.html')));
app.get('/c/:slug', (req, res) => res.sendFile(path.resolve('signup.html')));

// STAMP CHECKIN
app.post('/members/checkin', async (req, res) => {
  try {
    const { token } = req.body;

    const decoded = verifyStampToken(token);
    if(!decoded) return res.status(401).json({ error: 'Invalid or expired QR code. Please refresh the customer card.' });

    const memberId = decoded.memberId;
    const members = await getAllMembers();
    const member = members.find(m => m.memberId === memberId);
    if(!member) return res.status(404).json({ error: 'Member not found' });

    const FIVE_MINUTES = 5 * 60 * 1000;
    const lastStamp = member.lastStampAt ? new Date(member.lastStampAt).getTime() : 0;
    const now = Date.now();
    if(now - lastStamp < FIVE_MINUTES) {
      const secondsLeft = Math.ceil((FIVE_MINUTES - (now - lastStamp)) / 1000);
      return res.status(429).json({ error: `Too soon. Please wait ${secondsLeft} seconds before stamping again.` });
    }

    const newStamps = (member.stampsCollected || 0) + 1;
    await updateMember(member.id, { stampsCollected: newStamps, lastStampAt: new Date().toISOString() });
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
      const cookieOpts = {
        maxAge: 24 * 60 * 60 * 1000,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        signed: true
      };
      res.cookie('merchantId',       merchant.id,                  cookieOpts);
      res.cookie('merchantBizName',  merchant.businessName,        cookieOpts);
      res.cookie('merchantCardType', merchant.cardType || 'stamp', cookieOpts);
      res.json({ isMerchant: true, merchant });
    } else {
      res.json({ isMerchant: false });
    }
  } catch (error) {
    res.json({ isMerchant: false });
  }
});

// MERCHANT SLUG (public sign-up page)
app.get('/merchant/slug/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const merchants = await getAllMerchants();
    const merchant = merchants.find(m =>
      m.businessName?.toLowerCase().replace(/\s+/g, '-') === slug.toLowerCase()
    );
    if(merchant) {
      res.json({ success: true, merchant });
    } else {
      res.json({ success: false });
    }
  } catch(error) {
    res.json({ success: false });
  }
});

app.get('/merchant/me', async (req, res) => {
  try {
    const merchantId = req.signedCookies.merchantId;
    if(!merchantId) return res.json({ success: false });
    const merchants = await getAllMerchants();
    const merchant = merchants.find(m => m.id === merchantId);
    if(merchant){
      res.json({ success: true, merchant });
    } else {
      res.json({ success: false });
    }
  } catch(error){
    res.json({ success: false });
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
    const memberId = `STAMP-${uuidv4().split('-')[0].toUpperCase()}`;
    const stampToken = generateStampToken(memberId, merchantId || 'default');
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
      stampToken,
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