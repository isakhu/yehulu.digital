const fs = require('fs');
const path = require('path');

const UPLOADS_DIR = path.join(__dirname, 'public', 'uploads', 'projects');
const GALLERY_JSON = path.join(__dirname, 'data', 'gallery.json');

function syncGallery() {
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }

  let gallery = [];
  if (fs.existsSync(GALLERY_JSON)) {
    try {
      gallery = JSON.parse(fs.readFileSync(GALLERY_JSON, 'utf8'));
    } catch (e) {
      gallery = [];
    }
  }

  const existingUrls = new Set(gallery.map(item => item.imageUrl));
  const files = fs.readdirSync(UPLOADS_DIR);

  let addedCount = 0;
  files.forEach(file => {
    const ext = path.extname(file).toLowerCase();
    if (['.jpg', '.jpeg', '.png', '.webp', '.svg', '.gif'].includes(ext)) {
      const relUrl = `/uploads/projects/${file}`;
      if (!existingUrls.has(relUrl)) {
        // Generate clean title from filename
        const rawName = path.basename(file, ext);
        const title = rawName
          .replace(/[-_]+/g, ' ')
          .replace(/\b\w/g, c => c.toUpperCase());

        let category = 'BRAND IDENTITY';
        const lower = file.toLowerCase();
        if (lower.includes('photo') || lower.includes('shoot') || lower.includes('room') || lower.includes('suite') || lower.includes('lounge') || lower.includes('interior') || lower.includes('jacuzzi') || lower.includes('bath') || lower.includes('bamboo')) {
          category = 'COMMERCIAL';
        } else if (lower.includes('social') || lower.includes('post') || lower.includes('worker') || lower.includes('day') || lower.includes('holiday') || lower.includes('celebration') || lower.includes('beal')) {
          category = 'SOCIAL MEDIA';
        } else if (lower.includes('video') || lower.includes('ad') || lower.includes('poster') || lower.includes('banner') || lower.includes('commercial')) {
          category = 'COMMERCIAL';
        } else if (lower.includes('graphic') || lower.includes('flyer') || lower.includes('editorial')) {
          category = 'GRAPHIC DESIGN';
        }

        let client = 'Client Partner';
        if (lower.includes('rori')) client = 'Rori Hotel Hawassa';
        else if (lower.includes('panacea')) client = 'Panacea Hospital';

        const newItem = {
          id: `project-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
          title: title,
          slug: rawName.toLowerCase(),
          category: category,
          client: client,
          description: `Creative portfolio asset for ${title}.`,
          imageUrl: relUrl,
          year: new Date().getFullYear().toString(),
          featured: true,
          displayOrder: gallery.length + 1,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        gallery.unshift(newItem); // Newest first
        existingUrls.add(relUrl);
        addedCount++;
      }
    }
  });

  fs.writeFileSync(GALLERY_JSON, JSON.stringify(gallery, null, 2), 'utf8');
  console.log(`[GALLERY SYNC] Complete. ${addedCount} new image(s) added. Total: ${gallery.length} projects.`);
  return gallery;
}

if (require.main === module) {
  syncGallery();
}

module.exports = syncGallery;
