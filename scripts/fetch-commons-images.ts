#!/usr/bin/env node
// Fetch Wikimedia Commons thumbnails, upload to Vercel Blob, and emit a JSON manifest.
// Designed to run with `tsx` (Node 18+/tsx) or Bun. Uses @vercel/blob for uploads.

import dotenv from 'dotenv';
dotenv.config({ path: process.env.DOTENV_PATH || '.env.local' });

import fs from 'fs/promises';
import path from 'path';
import { put } from '@vercel/blob';

// Local approximation of the `PutBody` union accepted by @vercel/blob.
// @vercel/blob's package doesn't export a PutBody type in the installed version,
// so declare a compatible union here to satisfy TypeScript.
type PutBodyLocal = string | Uint8Array | Buffer | Blob | ReadableStream<any> | File;
import crypto from 'crypto';

const BLOB_TOKEN = process.env.BLOB_READ_WRITE_TOKEN;
if (!BLOB_TOKEN) {
  console.error('BLOB_READ_WRITE_TOKEN is required');
  process.exit(1);
}

// Hardcoded per request
const USER_AGENT = 'better-twitter/ingest (https://better-twitter.vercel.app/; aman.s.azad@gmail.com)';
const MAX_TOTAL = 15; // fixed to 15 images per run
const THUMB_WIDTH = 1200; // request 1200px thumbnails from Commons
const OUT_PATH = path.resolve('src/lib/data/commons_artworks.json');

const WIKIART_ACCESS = process.env.WIKIART_ACCESS_KEY;
const WIKIART_SECRET = process.env.WIKIART_SECRET_KEY;
const USE_WIKIART = Boolean(WIKIART_ACCESS && WIKIART_SECRET);
const WIKIART_IMAGE_FORMAT = 'HD';
const WIKIART_BASE = 'https://www.wikiart.org';

// If USE_WIKIART, these are the artist pages we will sample from.
const ARTIST_PAGES = [
  'zainul-abedin',
  'sm-sultan',
  'edouard-manet',
  'claude-monet',
  'ahmad-musa',
  'mir-ali-tabrizi',
  'ustad-mansur',
  'sultan-muhammad',
  'alexandre-gabriel-decamps',
  'jean-leon-gerome',
];

type Candidate = { title: string };

const TOPICS = [
  { key: 'impressionism', strategy: 'category', category: 'Category:Impressionist_paintings' },
  { key: 'photography', strategy: 'category', category: 'Category:Photographs' },
  { key: 'american_southwest', strategy: 'sparql', queryName: 'american_southwest' },
  { key: 'indian_subcontinent', strategy: 'sparql', queryName: 'indian_subcontinent' },
];

async function commonsApi(params: Record<string, string>) {
  const url = new URL('https://commons.wikimedia.org/w/api.php');
  Object.entries({ format: 'json', ...params }).forEach(([k, v]) => url.searchParams.append(k, v));
  const res = await fetch(url.toString(), { headers: { 'User-Agent': USER_AGENT } });
  if (!res.ok) throw new Error(`Commons API ${res.status} ${res.statusText}`);
  return res.json();
}

async function categoryMembers(category: string, limit = 200) {
  const res = await commonsApi({ action: 'query', list: 'categorymembers', cmtitle: category, cmtype: 'file', cmlimit: String(limit) });
  return res.query?.categorymembers || [];
}

async function imageInfoForTitles(titles: string[]) {
  // split into chunks of up to 50
  const chunks: string[][] = [];
  for (let i = 0; i < titles.length; i += 50) chunks.push(titles.slice(i, i + 50));
  const pages: Record<string, any> = {};
  for (const chunk of chunks) {
    console.log(`Fetching imageinfo for ${chunk.length} titles (chunk)`);
    const res = await commonsApi({ action: 'query', prop: 'imageinfo', titles: chunk.join('|'), iiprop: 'url|size|mime|extmetadata', iiurlwidth: String(THUMB_WIDTH) });
    Object.assign(pages, res.query?.pages || {});
  }
  return pages;
}

async function fetchSparql(query: string) {
  // Prefer the "bigdata" read-only endpoint which is often faster for simple SELECT queries.
  const bigdataUrl = new URL('https://query.wikidata.org/bigdata/namespace/wdq/sparql');
  bigdataUrl.searchParams.set('format', 'json');
  bigdataUrl.searchParams.set('query', query);
  const sparqlUrl = new URL('https://query.wikidata.org/sparql');
  sparqlUrl.searchParams.set('query', query);

  const maxAttempts = 6;
  // Try bigdata endpoint first, then fall back to the standard SPARQL endpoint.
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const useBigdata = attempt <= 2; // first two attempts try bigdata, then fall back
    const url = useBigdata ? bigdataUrl : sparqlUrl;
    try {
      console.log(`SPARQL request attempt ${attempt} to ${url.toString().slice(0, 300)}... (using ${useBigdata ? 'bigdata' : 'standard'} endpoint)`);
      const res = await fetch(url.toString(), { headers: { 'User-Agent': USER_AGENT, Accept: 'application/sparql-results+json' } });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        const errMsg = `SPARQL ${res.status} ${res.statusText}` + (text ? ` - ${text.slice(0, 300)}` : '');
        // Retry on 5xx / 504 for a few attempts
        if (res.status >= 500 && attempt < maxAttempts) {
          const waitMs = attempt * 2000;
          console.warn(`${errMsg}, retrying in ${waitMs}ms...`);
          await new Promise((r) => setTimeout(r, waitMs));
          continue;
        }
        throw new Error(errMsg);
      }
      const json = await res.json();
      return json;
    } catch (err: any) {
      // If we've exhausted attempts, surface the error
      if (attempt >= maxAttempts) {
        console.error('SPARQL failed after attempts', err.message || err);
        throw err;
      }
      const waitMs = attempt * 2000;
      console.warn(`SPARQL fetch error (attempt ${attempt}): ${err.message || err} - retrying in ${waitMs}ms`);
      await new Promise((r) => setTimeout(r, waitMs));
    }
  }
  throw new Error('SPARQL failed');
}

async function wikiArtApi(path: string, params: Record<string, string> = {}) {
  const url = new URL(`${WIKIART_BASE}${path}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.append(k, v));
  if (WIKIART_ACCESS) url.searchParams.set('accessKey', WIKIART_ACCESS);
  if (WIKIART_SECRET) url.searchParams.set('secretKey', WIKIART_SECRET);
  const headers: Record<string, string> = { 'User-Agent': USER_AGENT };
  if (WIKIART_ACCESS) headers['X-Access-Key'] = WIKIART_ACCESS;
  if (WIKIART_SECRET) headers['X-Secret-Key'] = WIKIART_SECRET;
  const res = await fetch(url.toString(), { headers });
  if (!res.ok) throw new Error(`WikiArt API ${res.status} ${res.statusText}`);
  return res.json();
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function shuffle<T>(a: T[]) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function sanitizeFileName(name: string) {
  return name.replace(/^File:/i, '').replace(/[\/\s]+/g, '_').replace(/[^a-zA-Z0-9_\-.,()]/g, '');
}

function sha256Hex(buf: Uint8Array) {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

function parseExtmetadata(info: any) {
  const md = info.extmetadata || {};
  const artist = md.Artist?.value || md.Credit?.value || '';
  const licenseName = md.LicenseShortName?.value || md.License?.value || '';
  const licenseUrl = md.LicenseUrl?.value || md.LicenseUrl?.url || '';
  const description = md.ImageDescription?.value || md.ObjectName?.value || '';
  const date = md.DateTimeOriginal?.value || md.DateTime?.value || '';
  return { artist, licenseName, licenseUrl, description, date, raw: md };
}

async function downloadBuffer(url: string) {
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!res.ok) throw new Error(`download failed ${res.status}`);
  const ab = await res.arrayBuffer();
  return Buffer.from(ab);
}

async function uploadToBlob(pathName: string, buffer: PutBodyLocal) {
  // Use the PutBody type exported by @vercel/blob so TypeScript accepts
  // the union of Buffer/Uint8Array/string/etc. at call sites.
  // The @vercel/blob package's shipped types are a bit restrictive here; allow the call.
  // @ts-ignore - allow passing our PutBodyLocal to put()
  const res = await put(pathName, buffer, { access: 'public', token: BLOB_TOKEN });
  return res.url as string;
}

async function processCandidate(page: Candidate, topicKey: string) {
  console.log(`Processing candidate ${page.title} for topic ${topicKey}`);
  const pages = await imageInfoForTitles([page.title]);
  const pageObj = Object.values(pages)[0];
  const info = (pageObj && pageObj.imageinfo && pageObj.imageinfo[0]) || null;
  if (!info) {
    console.log(`No imageinfo for ${page.title}`);
    return null;
  }
  const md = parseExtmetadata(info);
  // Exclude only when license or explicit restrictions indicate non-free/restricted.
  const licenseName = md.licenseName || '';
  const restrictionsValue = md.raw?.Restrictions?.value || md.raw?.Restrictions || '';
  const isRestricted = /non[- ]free|all rights reserved|copyrighted|no permission|no reuse/i.test(licenseName + ' ' + restrictionsValue);
  if (isRestricted) {
    // For testing: do not skip restricted images. Log and continue.
    console.log(`Note: ${page.title} appears restricted by metadata, but continuing for test. licenseName="${licenseName}", restrictions="${String(restrictionsValue).slice(0,200)}"`);
  }
  if (!info.thumburl && !info.url) {
    console.log(`Skipping ${page.title} - no thumb or url available`);
    return null;
  }
  const downloadUrl = info.thumburl || info.url;
  try {
    console.log(`Downloading thumbnail for ${page.title} from ${downloadUrl}`);
    const buffer = await downloadBuffer(downloadUrl);
    const fingerprint = sha256Hex(buffer);
    const safeName = sanitizeFileName(page.title);
    const ext = (downloadUrl.split('.').pop() || 'jpg').split('?')[0];
    const blobPath = `better-twitter/artwork/images/commons/${topicKey}/${safeName}.${ext}`;
    console.log(`Uploading ${page.title} to blob at ${blobPath}`);
    const blobUrl = await uploadToBlob(blobPath, buffer);
    console.log(`Uploaded ${page.title} -> ${blobUrl}`);
    return {
      id: page.title,
      title: page.title.replace(/^File:/i, ''),
      artist: md.artist,
      year: md.date,
      topic: topicKey,
      blob_path: blobPath,
      thumbnail_url: blobUrl,
      full_image_url: info.url || null,
      source_file_page: `https://commons.wikimedia.org/wiki/${encodeURIComponent(page.title)}`,
      license_name: md.licenseName,
      license_url: md.licenseUrl,
      fetched_at: new Date().toISOString(),
      fingerprint_sha256: fingerprint,
      raw_extmetadata: md.raw,
      width: info.width,
      height: info.height,
      mime: info.mime,
    };
  } catch (err: any) {
    console.error('processCandidate failed', page.title, err.message || err);
    return null;
  }
}

async function run() {
  console.log('Starting fetch-commons-images run');
  const results: any[] = [];
  const perTopic = Math.ceil(MAX_TOTAL / TOPICS.length);

  // Load previous manifest if exists to deduplicate and append to
  let previousFingerprints = new Set<string>();
  let previousIds = new Set<string>();
  let existingItems: any[] = [];
  try {
    const prev = await fs.readFile(OUT_PATH, 'utf8');
    const parsed = JSON.parse(prev);
    existingItems = parsed.items || [];
    for (const it of existingItems) {
      if (it.fingerprint_sha256) previousFingerprints.add(it.fingerprint_sha256);
      if (it.id) previousIds.add(it.id);
    }
  } catch (e) {
    // ignore (file may not exist)
  }
  if (USE_WIKIART) {
    console.log('Using WikiArt API - artist list provided in script');
    // Randomize artist order so each run picks a different artist first
    const artists = shuffle(ARTIST_PAGES.slice());
    for (const artistUrl of artists) {
      if (results.length >= MAX_TOTAL) break;
      console.log(`Processing artist ${artistUrl}`);
      let paginationToken: string | undefined = undefined;
      try {
        // Use PaintingSearch with the artist's name as the term and filter results to the artistUrl
        const term = artistUrl.replace(/-/g, ' ');
        do {
          const params: any = { term, imageFormat: WIKIART_IMAGE_FORMAT };
          if (paginationToken) params.paginationToken = paginationToken;
          const resp = await wikiArtApi('/en/api/2/PaintingSearch', params);
          const data = resp?.data || [];
          console.log(`PaintingSearch returned ${data.length} items for artist term "${term}"`);
          paginationToken = resp?.paginationToken;
          // Shuffle to pick random paintings from the results
          shuffle(data);
          for (const p of data) {
            if (results.length >= MAX_TOTAL) break;
            // Filter to the exact artist when possible
            const artistMatch = (p.artistUrl && p.artistUrl === artistUrl) || (p.artistName && String(p.artistName).toLowerCase().includes(term.toLowerCase()));
            if (!artistMatch) continue;
            const paintingId = String(p.id);
            const candidateId = `wikiart:${paintingId}`;
            if (previousIds.has(candidateId)) continue; // already have this painting
            try {
              const detail = await wikiArtApi('/en/api/2/Painting', { id: paintingId, imageFormat: WIKIART_IMAGE_FORMAT });
              await sleep(300);
              const painting = detail?.data || detail || {};
              const imageUrl = painting.image || painting.imageUrl || null;
              if (!imageUrl) continue;
              console.log(`Downloading WikiArt image ${painting.title} from ${imageUrl}`);
              const buffer = await downloadBuffer(imageUrl);
              const fingerprint = sha256Hex(buffer);
              if (previousFingerprints.has(fingerprint)) continue;
              // upload
              const safeName = sanitizeFileName(painting.title || paintingId);
              const ext = (imageUrl.split('.').pop() || 'jpg').split('?')[0];
              const blobPath = `better-twitter/artwork/images/wikiart/${painting.artistUrl || artistUrl}/${safeName}.${ext}`;
              console.log(`Uploading WikiArt painting ${painting.title} -> ${blobPath}`);
              const blobUrl = await uploadToBlob(blobPath, buffer);
              const item = {
                id: candidateId,
                title: painting.title,
                artist: painting.artistName,
                year: painting.completitionYear || painting.year || null,
                genres: painting.genres || painting.styles || painting.tags || [],
                topic: artistUrl,
                blob_path: blobPath,
                thumbnail_url: blobUrl,
                full_image_url: imageUrl,
                source_file_page: `${WIKIART_BASE}/en/${painting.artistUrl}/${painting.url}`,
                license_name: '',
                license_url: '',
                fetched_at: new Date().toISOString(),
                fingerprint_sha256: fingerprint,
                raw_extmetadata: painting,
                width: painting.width || painting.sizeX || null,
                height: painting.height || painting.sizeY || null,
                mime: null,
              };
              results.push(item);
              previousIds.add(candidateId);
              previousFingerprints.add(fingerprint);
              // small pause between image downloads
              await sleep(100);
            } catch (err: any) {
              console.warn('WikiArt painting processing failed', err.message || err);
            }
          }
          // modest pause between pages
          await sleep(300);
        } while (paginationToken && results.length < MAX_TOTAL);
      } catch (err: any) {
        console.error(`Artist processing failed for ${artistUrl}`, err.message || err);
      }
    }

    if (results.length === 0) {
      console.log('No new paintings found for provided artists. Exiting.');
      return;
    }
  } else {
    for (const t of TOPICS) {
      let candidates: Candidate[] = [];
      console.log(`Gathering candidates for topic ${t.key} (strategy=${t.strategy})`);
        if (t.strategy === 'category') {
          const cms = await categoryMembers(t.category!, 200);
        console.log(`Found ${cms.length} category members for ${t.category}`);
        candidates = cms.map((c: any) => ({ title: c.title }));
      } else if (t.strategy === 'sparql') {
        // SPARQL queries
        let query = '';
        if (t.queryName === 'indian_subcontinent') {
          // Optimized: limit traversal depth and use VALUES with property alternatives + EXISTS to avoid expensive arbitrary-length paths.
          query = `SELECT ?file WHERE {\n  VALUES ?country { wd:Q668 wd:Q843 wd:Q902 wd:Q837 wd:Q854 wd:Q819 }\n  ?work wdt:P18 ?file .\n  VALUES ?prop { wdt:P495 wdt:P19 wdt:P276 wdt:P159 wdt:P407 }\n  ?work ?prop ?place .\n  FILTER( ?place = ?country || EXISTS { ?place wdt:P131 ?country } )\n} LIMIT 100`;
        } else if (t.queryName === 'american_southwest') {
          // Optimized: restrict to a single hop and use VALUES + EXISTS to avoid long-running property-paths.
          query = `SELECT ?file WHERE {\n  VALUES ?state { wd:Q1490 wd:Q1124 wd:Q829 wd:Q1229 }\n  ?work wdt:P18 ?file .\n  VALUES ?prop { wdt:P276 wdt:P19 wdt:P159 }\n  ?work ?prop ?place .\n  FILTER( ?place = ?state || EXISTS { ?place wdt:P131 ?state } )\n} LIMIT 100`;
        }
        if (query) {
          const res = await fetchSparql(query);
          const bindings = res.results?.bindings || [];
          console.log(`SPARQL returned ${bindings.length} bindings for ${t.key}`);
          candidates = bindings.map((b: any) => {
            const file = b.file?.value || '';
            // file may be a full URL or a filename; try to extract File: name
            let title = file;
            if (file.includes('commons.wikimedia.org')) {
              // extract last segment
              const seg = file.split('/').pop() || file;
              title = decodeURIComponent(seg).replace(/^Special:FilePath\//i, '');
            } else if (file.startsWith('http')) {
              const seg = file.split('/').pop() || file;
              title = decodeURIComponent(seg);
            }
            // Ensure titles are prefixed with File: for the imageinfo endpoint
            if (!/^File:/i.test(title)) title = `File:${title}`;
            return { title };
          });
        }
      }

      shuffle(candidates);
      const pick = candidates.slice(0, perTopic);
      console.log(`Shuffled and selected ${pick.length} candidates for topic ${t.key}`);
      for (const p of pick) {
        if (results.length >= MAX_TOTAL) break;
        try {
          const item = await processCandidate(p, t.key);
          if (item && !previousFingerprints.has(item.fingerprint_sha256)) {
            results.push(item);
            previousFingerprints.add(item.fingerprint_sha256);
          }
        } catch (e) {
          // continue
        }
      }
      if (results.length >= MAX_TOTAL) break;
    }
  }

  const newItems = results.slice(0, MAX_TOTAL);
  // Append to existing items and dedupe by id
  const combined = [...existingItems, ...newItems];
  const byId = new Map<string, any>();
  for (const it of combined) {
    if (it && it.id) byId.set(it.id, it);
  }
  const finalItems = Array.from(byId.values());
  const manifest = { generated_at: new Date().toISOString(), source: USE_WIKIART ? 'wikiart' : 'wikimedia_commons', count: finalItems.length, items: finalItems };
  await fs.mkdir(path.dirname(OUT_PATH), { recursive: true });
  await fs.writeFile(OUT_PATH, JSON.stringify(manifest, null, 2), 'utf8');
  console.log(`Appended ${newItems.length} new items; manifest now has ${finalItems.length} items at ${OUT_PATH}`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
