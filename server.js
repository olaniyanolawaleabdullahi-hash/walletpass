const express = require('express');
const path = require('path');
const { createLoyaltyCard } = require('./card');
const { generatePass } = require('./generatePass');
const { addMember, getAllMembers, updateMember } = require('./firebase');
const { generateGoogleWalletLink } = require('./googleWallet');const app = express();
const port = 3000;

app.use(express.json());

app.get('/', (req, res) => {
  res.sendFile(path.resolve('dashboard.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.resolve('login.html'));
});

app.get('/members-page', (req, res) => {
  res.sendFile(path.resolve('members.html'));
});

app.get('/issue', (req, res) => {
  res.sendFile(path.resolve('issue.html'));
});
app.get('/settings', (req, res) => {
  res.sendFile(path.resolve('settings.html'));
});

app.get('/register', (req, res) => {
  res.sendFile(path.resolve('register.html'));
});

app.post('/register/card', async (req, res) => {
  try {
    const { name, email, phone, businessName, walletType, bgColor, textColor, expiry } = req.body;
    
    const members = await getAllMembers();
    const nextNumber = String(members.length + 1).padStart(3, '0');
    const memberId = `MEMBER${nextNumber}`;

    const memberData = {
      name,
      email,
      phone: phone || '',
      memberId,
      businessName: businessName || 'LoyaltyPass Co.',
      points: 0,
      loyaltyStatus: 'Bronze Member',
      expiryDate: expiry || '12/2026',
      registeredAt: new Date().toISOString()
    };

    await addMember(memberData);

    if (walletType === 'google') {
      const customerData = {
        id: memberId,
        businessName: memberData.businessName,
        name: memberData.name,
        points: memberData.points,
        loyaltyStatus: memberData.loyaltyStatus,
        expiryDate: memberData.expiryDate
      };
      const googleWalletLink = await generateGoogleWalletLink(customerData);
      res.json({ success: true, walletUrl: googleWalletLink });
    } else {
      res.json({ success: true, walletUrl: '/card/download?id=' + memberId });
    }
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Failed to register card' });
  }
});

app.get('/members', async (req, res) => {
  try {
    const members = await getAllMembers();
    res.json(members);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get members' });
  }
});

app.post('/members/add', async (req, res) => {
  try {
    const memberData = req.body;
    const id = await addMember(memberData);
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

app.get('/card/download', async (req, res) => {
  try {
    const members = await getAllMembers();
    const member = members.find(m => m.memberId === req.query.id);

    if (!member) {
      return res.status(404).json({ error: 'Member not found' });
    }

    const customerData = {
      id: member.memberId,
      businessName: member.businessName,
      name: member.name,
      points: member.points,
      loyaltyStatus: member.loyaltyStatus,
      expiryDate: member.expiryDate
    };

    const passPath = await generatePass(customerData);
    res.setHeader('Content-Type', 'application/vnd.apple.pkpass');
    res.setHeader('Content-Disposition', 'attachment; filename=loyaltycard.pkpass');
    res.sendFile(path.resolve(passPath));
  } catch (error) {
    console.error('Error generating pass:', error);
    res.status(500).json({ error: 'Failed to generate pass' });
  }
});
app.get('/card/google', async (req, res) => {
  try {
    const members = await getAllMembers();
    const member = members.find(m => m.memberId === req.query.id);

    if (!member) {
      return res.status(404).json({ error: 'Member not found' });
    }

    const customerData = {
      id: member.memberId,
      businessName: member.businessName,
      name: member.name,
      points: member.points,
      loyaltyStatus: member.loyaltyStatus,
      expiryDate: member.expiryDate
    };

  const googleWalletLink = await generateGoogleWalletLink(customerData);
res.redirect(googleWalletLink);
  } catch (error) {
    console.error('GOOGLE WALLET ERROR:', error.message || error);
    res.status(500).json({ error: 'Failed to generate Google Wallet link', details: error.message });
  }
});
app.listen(port, () => {
  console.log(`WalletPass server running on http://localhost:${port}`);
}); 