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