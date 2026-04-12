const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

function generateImages() {
  // Create logo (160x50)
  const logoCanvas = createCanvas(160, 50);
  const logoCtx = logoCanvas.getContext('2d');
  logoCtx.fillStyle = '#000000';
  logoCtx.fillRect(0, 0, 160, 50);
  logoCtx.fillStyle = '#FFD700';
  logoCtx.font = 'bold 20px sans-serif';
  logoCtx.fillText('LoyaltyPass', 10, 35);
  fs.writeFileSync(path.join('passImages', 'logo.png'), logoCanvas.toBuffer('image/png'));

  // Create icon (58x58)
  const iconCanvas = createCanvas(58, 58);
  const iconCtx = iconCanvas.getContext('2d');
  iconCtx.fillStyle = '#000000';
  iconCtx.fillRect(0, 0, 58, 58);
  iconCtx.fillStyle = '#FFD700';
  iconCtx.font = 'bold 28px sans-serif';
  iconCtx.fillText('LP', 12, 40);
  fs.writeFileSync(path.join('passImages', 'icon.png'), iconCanvas.toBuffer('image/png'));

  // Create strip (320x123)
  const stripCanvas = createCanvas(320, 123);
  const stripCtx = stripCanvas.getContext('2d');
  stripCtx.fillStyle = '#000000';
  stripCtx.fillRect(0, 0, 320, 123);
  stripCtx.fillStyle = '#FFD700';
  stripCtx.font = 'bold 24px sans-serif';
  stripCtx.fillText('LOYALTY MEMBER', 20, 70);
  fs.writeFileSync(path.join('passImages', 'strip.png'), stripCanvas.toBuffer('image/png'));

  console.log('Images generated successfully!');
}

generateImages();