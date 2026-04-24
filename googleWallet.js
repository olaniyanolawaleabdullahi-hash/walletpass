const { GoogleAuth } = require('google-auth-library');
const jwt = require('jsonwebtoken');
const fs = require('fs');

async function generateGoogleWalletLink(customerData) {
  const issuerId = '3388000000023115103';
  const classSuffix = 'loyaltyClass';
  const objectSuffix = customerData.id;

  const serviceAccount = JSON.parse(fs.readFileSync('./google-service-account.json'));

  const auth = new GoogleAuth({
    keyFile: './google-service-account.json',
    scopes: ['https://www.googleapis.com/auth/wallet_object.issuer']
  });

  const client = await auth.getClient();

  const loyaltyObject = {
    id: `${issuerId}.${objectSuffix}`,
    classId: `${issuerId}.${classSuffix}`,
    state: 'ACTIVE',
    accountId: customerData.id,
    accountName: customerData.name,
    loyaltyPoints: {
      balance: {
        string: `${customerData.points} pts`
      },
      label: 'Points'
    },
    textModulesData: [
      {
        header: 'Status',
        body: customerData.loyaltyStatus,
        id: 'status'
      },
      {
        header: 'Expires',
        body: customerData.expiryDate,
        id: 'expiry'
      }
    ],
    barcode: {
      type: 'QR_CODE',
      value: customerData.id
    }
  };

  try {
    await client.request({
      url: `https://walletobjects.googleapis.com/walletobjects/v1/loyaltyObject/${issuerId}.${objectSuffix}`,
      method: 'GET'
    });
  } catch (e) {
    await client.request({
      url: 'https://walletobjects.googleapis.com/walletobjects/v1/loyaltyObject',
      method: 'POST',
      data: loyaltyObject
    });
  }

  const claims = {
    iss: serviceAccount.client_email,
    aud: 'google',
    typ: 'savetowallet',
    payload: {
      loyaltyObjects: [{ id: `${issuerId}.${objectSuffix}` }]
    }
  };

  const token = jwt.sign(claims, serviceAccount.private_key, { algorithm: 'RS256' });
  return `https://pay.google.com/gp/v/save/${token}`;
}

module.exports = { generateGoogleWalletLink };