'use strict';

const { readJSON, writeJSON } = require('./data-store');
const { readRequestBuffer } = require('./request-body');

const FILE_NAME = 'industries.json';

function response(status, body) {
  return { status, body };
}

async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body); } catch (_) { return {}; }
  }

  const buffer = await readRequestBuffer(req, 1024 * 1024);
  try { return JSON.parse(buffer.toString('utf8') || '{}'); }
  catch (_) { return {}; }
}

function text(value, max = 160) {
  return String(value || '').trim().slice(0, max);
}

function slugify(value) {
  return text(value, 100).toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function validUrl(value) {
  if (!value) return '';
  try {
    const parsed = new URL(String(value).trim());
    return ['https:', 'http:'].includes(parsed.protocol) ? parsed.toString() : null;
  } catch (_) {
    return null;
  }
}

function normaliseSocialLinks(value) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 20).map((item) => {
    const platform = text(item && item.platform, 40);
    const url = validUrl(item && item.url);
    return platform && url ? { platform, url } : null;
  }).filter(Boolean);
}

function makeId(prefix) {
  return prefix + '-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
}

async function getIndustries() {
  const value = await readJSON(FILE_NAME, []);
  return Array.isArray(value) ? value : [];
}

async function saveIndustries(value) {
  await writeJSON(FILE_NAME, value);
}

async function handleIndustryApi(pathname, method, req) {
  if (!pathname.startsWith('/api/industries')) return null;

  if (pathname === '/api/industries') {
    if (method === 'GET' || method === 'HEAD') {
      return response(200, await getIndustries());
    }

    if (method === 'POST') {
      const body = await readBody(req);
      const name = text(body.name, 100);
      const description = text(body.description, 500);
      if (!name) return response(400, { error: 'Industry name is required.' });

      const industries = await getIndustries();
      if (industries.some(item => item.name.toLowerCase() === name.toLowerCase())) {
        return response(409, { error: 'This industry already exists.' });
      }

      const industry = {
        id: makeId('industry'),
        name,
        slug: slugify(name),
        description,
        subIndustries: [],
        organizations: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      industries.unshift(industry);
      await saveIndustries(industries);
      return response(201, industry);
    }

    return response(405, { error: 'Method not allowed.' });
  }

  const match = pathname.match(/^\/api\/industries\/([^/]+)(?:\/(sub-industries|organizations)(?:\/([^/]+))?)?$/);
  if (!match) return response(404, { error: 'Industry route not found.' });

  const industryId = decodeURIComponent(match[1]);
  const resource = match[2] || '';
  const itemId = match[3] ? decodeURIComponent(match[3]) : '';
  const industries = await getIndustries();
  const industryIndex = industries.findIndex(item => item.id === industryId);
  if (industryIndex === -1) return response(404, { error: 'Industry not found.' });

  const industry = industries[industryIndex];

  if (!resource) {
    if (method === 'PUT') {
      const body = await readBody(req);
      const name = body.name === undefined ? industry.name : text(body.name, 100);
      if (!name) return response(400, { error: 'Industry name is required.' });
      if (industries.some(item => item.id !== industryId && item.name.toLowerCase() === name.toLowerCase())) {
        return response(409, { error: 'This industry already exists.' });
      }
      industry.name = name;
      industry.slug = slugify(name);
      if (body.description !== undefined) industry.description = text(body.description, 500);
      industry.updatedAt = new Date().toISOString();
      await saveIndustries(industries);
      return response(200, industry);
    }

    if (method === 'DELETE') {
      if ((industry.organizations || []).length || (industry.subIndustries || []).length) {
        return response(409, { error: 'Remove its organizations and sub-industries before deleting this industry.' });
      }
      industries.splice(industryIndex, 1);
      await saveIndustries(industries);
      return response(200, { success: true, deletedId: industryId });
    }

    return response(405, { error: 'Method not allowed.' });
  }

  if (resource === 'sub-industries') {
    industry.subIndustries = Array.isArray(industry.subIndustries) ? industry.subIndustries : [];

    if (!itemId && method === 'POST') {
      const body = await readBody(req);
      const name = text(body.name, 100);
      if (!name) return response(400, { error: 'Sub-industry name is required.' });
      if (industry.subIndustries.some(item => item.name.toLowerCase() === name.toLowerCase())) {
        return response(409, { error: 'This sub-industry already exists.' });
      }
      const subIndustry = { id: makeId('sub'), name };
      industry.subIndustries.push(subIndustry);
      industry.updatedAt = new Date().toISOString();
      await saveIndustries(industries);
      return response(201, subIndustry);
    }

    if (itemId && method === 'DELETE') {
      const index = industry.subIndustries.findIndex(item => item.id === itemId);
      if (index === -1) return response(404, { error: 'Sub-industry not found.' });
      if ((industry.organizations || []).some(item => item.subIndustryId === itemId)) {
        return response(409, { error: 'Move the organizations assigned to this sub-industry before deleting it.' });
      }
      industry.subIndustries.splice(index, 1);
      industry.updatedAt = new Date().toISOString();
      await saveIndustries(industries);
      return response(200, { success: true, deletedId: itemId });
    }

    return response(405, { error: 'Method not allowed.' });
  }

  if (resource === 'organizations') {
    industry.organizations = Array.isArray(industry.organizations) ? industry.organizations : [];

    if (!itemId && method === 'POST') {
      const body = await readBody(req);
      const name = text(body.name, 120);
      if (!name) return response(400, { error: 'Organization name is required.' });
      if (industry.organizations.some(item => item.name.toLowerCase() === name.toLowerCase())) {
        return response(409, { error: 'This organization already exists in the selected industry.' });
      }
      const website = validUrl(body.website);
      if (body.website && !website) return response(400, { error: 'Enter a valid website URL beginning with http:// or https://.' });
      const subIndustryId = text(body.subIndustryId, 120);
      if (subIndustryId && !industry.subIndustries.some(item => item.id === subIndustryId)) {
        return response(400, { error: 'Select a valid sub-industry for this organization.' });
      }

      const organization = {
        id: makeId('org'),
        name,
        description: text(body.description, 500),
        website,
        logoUrl: text(body.logoUrl, 1000),
        subIndustryId,
        socialLinks: normaliseSocialLinks(body.socialLinks),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      industry.organizations.unshift(organization);
      industry.updatedAt = new Date().toISOString();
      await saveIndustries(industries);
      return response(201, organization);
    }

    if (itemId && method === 'PUT') {
      const body = await readBody(req);
      const index = industry.organizations.findIndex(item => item.id === itemId);
      if (index === -1) return response(404, { error: 'Organization not found.' });
      const organization = industry.organizations[index];

      if (body.name !== undefined) {
        const name = text(body.name, 120);
        if (!name) return response(400, { error: 'Organization name is required.' });
        if (industry.organizations.some(item => item.id !== itemId && item.name.toLowerCase() === name.toLowerCase())) {
          return response(409, { error: 'This organization already exists in the selected industry.' });
        }
        organization.name = name;
      }
      if (body.description !== undefined) organization.description = text(body.description, 500);
      if (body.website !== undefined) {
        const website = validUrl(body.website);
        if (body.website && !website) return response(400, { error: 'Enter a valid website URL beginning with http:// or https://.' });
        organization.website = website;
      }
      if (body.logoUrl !== undefined) organization.logoUrl = text(body.logoUrl, 1000);
      if (body.subIndustryId !== undefined) {
        const subIndustryId = text(body.subIndustryId, 120);
        if (subIndustryId && !industry.subIndustries.some(item => item.id === subIndustryId)) {
          return response(400, { error: 'Select a valid sub-industry for this organization.' });
        }
        organization.subIndustryId = subIndustryId;
      }
      if (body.socialLinks !== undefined) organization.socialLinks = normaliseSocialLinks(body.socialLinks);
      organization.updatedAt = new Date().toISOString();
      industry.updatedAt = new Date().toISOString();
      await saveIndustries(industries);
      return response(200, organization);
    }

    if (itemId && method === 'DELETE') {
      const index = industry.organizations.findIndex(item => item.id === itemId);
      if (index === -1) return response(404, { error: 'Organization not found.' });
      industry.organizations.splice(index, 1);
      industry.updatedAt = new Date().toISOString();
      await saveIndustries(industries);
      return response(200, { success: true, deletedId: itemId });
    }
  }

  return response(405, { error: 'Method not allowed.' });
}

module.exports = { handleIndustryApi };
