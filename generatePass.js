const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const forge = require('node-forge');
const { createLoyaltyCard } = require('./card');

function generatePass(customerData) {
  return new Promise((resolve, reject) => {
    try {
      const card = createLoyaltyCard(customerData);
      const passFolder = path.join('passes', customerData.id);

      if (!fs.existsSync('passes')) {
        fs.mkdirSync('passes');
      }
      if (!fs.existsSync(passFolder)) {
        fs.mkdirSync(passFolder, { recursive: true });
      }

      fs.writeFileSync(
        path.join(passFolder, 'pass.json'),
        JSON.stringify(card, null, 2)
      );

      const imagesToCopy = ['logo.png', 'icon.png', 'strip.png'];
      imagesToCopy.forEach(image => {
        fs.copyFileSync(
          path.join('passImages', image),
          path.join(passFolder, image)
        );
      });

      const manifest = {};
      const files = fs.readdirSync(passFolder);
      files.forEach(file => {
        const filePath = path.join(passFolder, file);
        const fileBuffer = fs.readFileSync(filePath);
        const md = forge.md.sha1.create();
        md.update(fileBuffer.toString('binary'));
        manifest[file] = md.digest().toHex();
      });

      fs.writeFileSync(
        path.join(passFolder, 'manifest.json'),
        JSON.stringify(manifest, null, 2)
      );

      const outputPath = path.join('passes', `${customerData.id}.pkpass`);
      
      if (fs.existsSync(outputPath)) {
        fs.unlinkSync(outputPath);
      }

      const output = fs.createWriteStream(outputPath);
      const archive = archiver('zip');

      output.on('close', () => {
        console.log(`Pass created: ${outputPath}`);
        resolve(outputPath);
      });

      archive.on('error', (err) => {
        console.error('Archive error:', err);
        reject(err);
      });

      archive.pipe(output);
      archive.directory(passFolder, false);
      archive.finalize();
    } catch (err) {
      console.error('Generate pass error:', err);
      reject(err);
    }
  });
}

module.exports = { generatePass };