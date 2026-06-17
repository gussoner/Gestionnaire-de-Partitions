const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');

// S'assurer que le dossier dist existe
const distDir = path.join(__dirname, 'dist');
if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir);
}

// Lire le manifest.json d'origine depuis /src
const manifestPath = path.join(__dirname, 'src', 'manifest.json');
if (!fs.existsSync(manifestPath)) {
    console.error("❌ Erreur : Impossible de trouver le fichier src/manifest.json");
    process.exit(1);
}

const manifestSource = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const version = manifestSource.version;
console.log(`📦 Préparation de la version ${version}...`);

try {
    // ==========================================
    // 1. ZIP POUR CHROME & MICROSOFT EDGE
    // ==========================================
    const chromeZip = new AdmZip();
    const srcFiles = fs.readdirSync(path.join(__dirname, 'src'));
    
    srcFiles.forEach(file => {
        const filePath = path.join(__dirname, 'src', file);
        const stat = fs.statSync(filePath);
        
        if (file === 'manifest.json') {
            // Manifeste pur (on vire la ligne scripts si elle y est)
            const modifiedManifest = JSON.parse(JSON.stringify(manifestSource));
            if (modifiedManifest.background && modifiedManifest.background.scripts) {
                delete modifiedManifest.background.scripts;
            }
            chromeZip.addFile('manifest.json', Buffer.from(JSON.stringify(modifiedManifest, null, 2), 'utf8'));
        } else if (stat.isDirectory()) {
            chromeZip.addLocalFolder(filePath, file);
        } else {
            chromeZip.addLocalFile(filePath);
        }
    });
    chromeZip.writeZip(path.join(distDir, `v${version}-chromium.zip`));
    console.log(`✅ Créé avec succès : dist/v${version}-chromium.zip`);

    // ==========================================
    // 2. ZIP POUR FIREFOX
    // ==========================================
    const firefoxZip = new AdmZip();
    
    srcFiles.forEach(file => {
        const filePath = path.join(__dirname, 'src', file);
        const stat = fs.statSync(filePath);
        
        if (file === 'manifest.json') {
            // Manifeste hybride avec injection de la ligne de l'enfer
            const modifiedManifest = JSON.parse(JSON.stringify(manifestSource));
            if (!modifiedManifest.background) modifiedManifest.background = {};
            modifiedManifest.background.scripts = ["background.js"];
            firefoxZip.addFile('manifest.json', Buffer.from(JSON.stringify(modifiedManifest, null, 2), 'utf8'));
        } else if (stat.isDirectory()) {
            firefoxZip.addLocalFolder(filePath, file);
        } else {
            firefoxZip.addLocalFile(filePath);
        }
    });
    firefoxZip.writeZip(path.join(distDir, `v${version}-firefox.zip`));
    console.log(`✅ Créé avec succès : dist/v${version}-firefox.zip`);

    // ==========================================
    // 3. ZIP COMPLET POUR GITHUB
    // ==========================================
    const githubZip = new AdmZip();
    const rootFiles = fs.readdirSync(__dirname);
    
    rootFiles.forEach(file => {
        if (file !== 'dist' && file !== 'node_modules' && file !== '.git') {
            const filePath = path.join(__dirname, file);
            const stat = fs.statSync(filePath);
            if (stat.isDirectory()) {
                githubZip.addLocalFolder(filePath, file);
            } else {
                githubZip.addLocalFile(filePath);
            }
        }
    });
    githubZip.writeZip(path.join(distDir, `v${version}-github-complete.zip`));
    console.log(`✅ Créé avec succès : dist/v${version}-github-complete.zip`);

    console.log("\n🚀 Tout est prêt ! Les 3 ZIP spécifiques ont été générés dans le dossier /dist.");

} catch (error) {
    console.error("❌ Une erreur est survenue pendant le build :", error);
}