import sharp from 'sharp';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');
const logoPath = join(rootDir, 'public', 'pwa-icons', 'logoBase.png');
const outputDir = join(rootDir, 'public', 'pwa-icons');

const logoBuffer = readFileSync(logoPath);

// Tamaños estándar para PWA
const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

console.log('🔄 Generando iconos PWA optimizados desde logoBase.png...\n');

for (const size of sizes) {
    const outputPath = join(outputDir, `icon-${size}x${size}.png`);

    const result = await sharp(logoBuffer)
        .resize(size, size, {
            fit: 'cover',
            position: 'center'
        })
        .png({
            quality: 85,          // Compresión optimizada (0-100, menor = más compresión)
            compressionLevel: 9,  // Nivel máximo de compresión (0-9)
            adaptiveFiltering: true,
            palette: true         // Usar paleta para reducir tamaño
        })
        .toFile(outputPath);

    const fileSizeKB = (result.size / 1024).toFixed(2);
    console.log(`✅ Generated ${size}x${size} icon (${fileSizeKB} KB)`);
}

// Also create apple-touch-icon (180x180)
const appleResult = await sharp(logoBuffer)
    .resize(180, 180, {
        fit: 'cover',
        position: 'center'
    })
    .png({
        quality: 85,
        compressionLevel: 9,
        adaptiveFiltering: true,
        palette: true
    })
    .toFile(join(outputDir, 'apple-touch-icon.png'));
const appleFileSizeKB = (appleResult.size / 1024).toFixed(2);
console.log(`✅ Generated apple-touch-icon (180x180) (${appleFileSizeKB} KB)`);

console.log('\n🎉 All PWA icons generated successfully with optimized compression!');
