const test = require('node:test');
const assert = require('node:assert/strict');
const {
  homeSectionConfigSchemas,
  collectionInputSchema,
  lookbookInputSchema
} = require('../src/lib/validation/schemas.ts');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const SmartImage = require('../src/components/ui/SmartImage.tsx').default;
const { suggestSlug } = require('../src/lib/admin/slug.ts');
const {
  fallbackHomeSections
} = require('../src/lib/storefront/home-fallback.ts');

test('product URL suggestion turns an English name into a safe readable path', () => {
  assert.equal(suggestSlug('The Sculpted Tote'), 'the-sculpted-tote');
  assert.equal(suggestSlug('  Édition No. 02 / Silk  '), 'edition-no-02-silk');
  assert.equal(suggestSlug('!!!'), '');
});

test('an unconfigured homepage uses available catalog content without replacing the brand hero', () => {
  const hero = { headlineEn: 'Maison', headlineAr: 'ميزون' };
  assert.deepEqual(
    fallbackHomeSections(hero, 7, [2, 3]).map((s) => s.type),
    ['hero', 'collection_highlight']
  );
  assert.equal(fallbackHomeSections(hero, 7, [2]).at(1).config.collectionId, 7);
  assert.deepEqual(
    fallbackHomeSections(hero, null, [2, 3]).map((s) => s.type),
    ['hero', 'featured_products']
  );
  assert.deepEqual(
    fallbackHomeSections(hero, null, []).map((s) => s.type),
    ['hero']
  );
});

test('legacy hero content gains compatible presentation defaults without losing its text or image', () => {
  const hero = homeSectionConfigSchemas.hero.parse({
    imageMediaId: 7,
    headlineEn: 'Maison',
    headlineAr: 'ميزون'
  });
  assert.equal(hero.imageMediaId, 7);
  assert.equal(hero.headlineAr, 'ميزون');
  assert.equal(hero.layout, 'overlay');
  assert.equal(hero.imagePresentation.fit, 'cover');
  assert.equal(hero.imagePresentation.mobileX, 50);
});

test('section validation preserves mobile art direction and rejects invalid positioning', () => {
  const hero = homeSectionConfigSchemas.hero.parse({
    layout: 'split',
    mobileImageMediaId: 9,
    imagePresentation: { x: 20, mobileX: 80 }
  });
  assert.equal(hero.mobileImageMediaId, 9);
  assert.equal(hero.imagePresentation.x, 20);
  assert.equal(hero.imagePresentation.mobileX, 80);
  assert.equal(
    homeSectionConfigSchemas.hero.safeParse({ imagePresentation: { x: 101 } })
      .success,
    false
  );
});

test('collection and lookbook crops survive validation independently', () => {
  const collection = collectionInputSchema.parse({
    slug: 'silk',
    nameEn: 'Silk',
    nameAr: 'حرير',
    imagePresentation: { x: 10 }
  });
  const lookbook = lookbookInputSchema.parse({
    imageMediaId: 7,
    imagePresentation: { x: 90 }
  });
  assert.equal(collection.imagePresentation.x, 10);
  assert.equal(lookbook.imagePresentation.x, 90);
});

test('product images preserve proportions and missing-image placeholders fill their reserved frame', () => {
  const html = renderToStaticMarkup(
    React.createElement(SmartImage, { mediaId: 1, alt: 'Silk', sizes: '50vw' })
  );
  assert.match(html, /object-fit:contain/);
  const missing = renderToStaticMarkup(
    React.createElement(SmartImage, { mediaId: null, alt: 'Silk' })
  );
  assert.match(missing, /absolute inset-0/);
});

test('additive presentation migration preserves existing collection and lookbook records', () => {
  const Database = require('better-sqlite3');
  const { MIGRATIONS } = require('../src/lib/db/migrations.ts');
  const db = new Database(':memory:');
  db.exec(MIGRATIONS[0].sql);
  db.exec(
    "INSERT INTO collections (slug,name_en,name_ar) VALUES ('silk','Silk','حرير')"
  );
  for (const migration of MIGRATIONS.slice(1)) db.exec(migration.sql);
  const row = db.prepare('SELECT * FROM collections').get();
  assert.equal(row.name_ar, 'حرير');
  assert.equal(row.image_presentation, '{}');
  assert.ok(
    db
      .prepare('PRAGMA table_info(lookbook_items)')
      .all()
      .some((c) => c.name === 'image_presentation')
  );
  db.close();
});

test('placement defaults tolerate old or corrupt JSON and keep coordinates bounded', () => {
  const {
    readPresentation,
    validateImageFile,
    MAX_IMAGE_BYTES
  } = require('../src/lib/media/presentation');
  assert.equal(readPresentation('{broken').x, 50);
  assert.deepEqual(readPresentation({ x: -5, y: 150, mobileX: NaN }), {
    fit: 'cover',
    x: 0,
    y: 100,
    mobileX: 50,
    mobileY: 100
  });
  assert.equal(
    validateImageFile({ size: MAX_IMAGE_BYTES + 1, type: 'image/jpeg' }),
    'fileTooLarge'
  );
  assert.equal(
    validateImageFile({ size: 10, type: 'image/svg+xml' }),
    'invalidFileType'
  );
  assert.equal(validateImageFile({ size: 100, type: '' }), null);
});

test('mobile artwork uses a responsive source without double preloading', () => {
  const html = renderToStaticMarkup(
    React.createElement(SmartImage, {
      mediaId: 1,
      mobileMediaId: 2,
      alt: '',
      priority: true,
      presentation: { x: 20, mobileX: 80 }
    })
  );
  assert.match(html, /<source media="\(max-width: 767px\)"/);
  assert.match(html, /media%2F2/);
  assert.match(html, /--image-position:20% 50%/);
  assert.match(html, /--image-mobile-position:80% 50%/);
  assert.doesNotMatch(html, /rel="preload"/);
});

test('persistent placement changes round-trip, while mobile-only assets remain protected from deletion', async () => {
  const fs = require('node:fs'),
    os = require('node:os'),
    path = require('node:path');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'luxe-media-contract-'));
  process.env.DATA_DIR = dir;
  const { getDb, closeDb } = require('../src/lib/db/client');
  const { processUpload, deleteMedia } = require('../src/lib/server/media');
  const {
    createHomeSection,
    visibleHomeSections,
    createLookbookItem,
    visibleLookbook
  } = require('../src/lib/db/repos/content');
  const {
    createCollection,
    collectionById,
    updateCollection
  } = require('../src/lib/db/repos/collections');
  try {
    const bytes = await require('sharp')({
      create: { width: 100, height: 160, channels: 3, background: '#a98a5b' }
    })
      .png()
      .toBuffer();
    const upload = await processUpload(
      new File([bytes], 'portrait.png', { type: 'image/png' })
    );
    assert.equal(upload.ok, true);
    const duplicate = await processUpload(
      new File([bytes], 'another-name.png', { type: 'image/png' })
    );
    assert.equal(duplicate.media.id, upload.media.id);
    const invalid = await processUpload(
      new File(['not an image'], 'bad.png', { type: 'image/png' })
    );
    assert.equal(invalid.ok, false);
    createHomeSection(
      'hero',
      {
        mobileImageMediaId: upload.media.id,
        imagePresentation: { mobileX: 84 }
      },
      true,
      0
    );
    assert.equal(
      JSON.parse(visibleHomeSections()[0].config).imagePresentation.mobileX,
      84
    );
    assert.equal(deleteMedia(upload.media.id).reason, 'in_use');
    const collection = collectionInputSchema.parse({
      slug: 'local-contract',
      nameEn: 'Local',
      nameAr: 'محلي',
      imageMediaId: upload.media.id,
      imagePresentation: { x: 12 }
    });
    const id = createCollection(collection);
    updateCollection(id, {
      ...collection,
      imagePresentation: { ...collection.imagePresentation, x: 75 }
    });
    assert.equal(JSON.parse(collectionById(id).image_presentation).x, 75);
    createLookbookItem(
      lookbookInputSchema.parse({
        imageMediaId: upload.media.id,
        imagePresentation: { x: 30 }
      })
    );
    assert.equal(JSON.parse(visibleLookbook()[0].image_presentation).x, 30);
    assert.equal(getDb().prepare('SELECT count(*) AS n FROM media').get().n, 1);
  } finally {
    closeDb();
    if (
      path.dirname(dir) !== path.resolve(os.tmpdir()) ||
      !path.basename(dir).startsWith('luxe-media-contract-')
    )
      throw Error('Unexpected test directory');
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
