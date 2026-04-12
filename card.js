function createLoyaltyCard(customerData) {
  return {
    formatVersion: 1,
    passTypeIdentifier: "pass.com.walletpass.loyalty",
    serialNumber: customerData.id,
    teamIdentifier: "XXXXXXXXXX",
    organizationName: customerData.businessName,
    description: "Loyalty Card",
    backgroundColor: "rgb(0, 0, 0)",
    foregroundColor: "rgb(255, 215, 0)",
    labelColor: "rgb(255, 215, 0)",
    storeCard: {
      headerFields: [
        {
          key: "points",
          label: "POINTS",
          value: customerData.points
        }
      ],
      primaryFields: [
        {
          key: "name",
          label: "MEMBER NAME",
          value: customerData.name
        }
      ],
      secondaryFields: [
        {
          key: "status",
          label: "STATUS",
          value: customerData.loyaltyStatus
        },
        {
          key: "expiry",
          label: "EXPIRES",
          value: customerData.expiryDate
        }
      ],
      barcode: {
        message: customerData.id,
        format: "PKBarcodeFormatQR",
        messageEncoding: "iso-8859-1"
      }
    }
  };
}

module.exports = { createLoyaltyCard };