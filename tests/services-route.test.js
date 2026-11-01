'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '..', 'public', 'index.html'), 'utf8');
const assignStart = html.indexOf('function assignSectionIds()');
const assignEnd = html.indexOf('//  4. INJECT COMPACT FAQ ACCORDION', assignStart);
const assignSectionIds = html.slice(assignStart, assignEnd);

test('services visibility stays fail-open until its route section is identified', () => {
  const initialViewAssignment = assignSectionIds.indexOf(
    "if (currentView && currentView !== 'services') document.body.setAttribute('data-yd-view', currentView);"
  );
  const serviceGridLookup = assignSectionIds.indexOf('var serviceGrid =');
  const sectionReadiness = assignSectionIds.indexOf('servicesSectionReady = true;');
  const servicesViewAssignment = assignSectionIds.indexOf(
    "document.body.setAttribute('data-yd-view', 'services');"
  );

  assert.notEqual(initialViewAssignment, -1);
  assert.ok(serviceGridLookup > initialViewAssignment);
  assert.ok(sectionReadiness > serviceGridLookup);
  assert.ok(servicesViewAssignment > sectionReadiness);
  assert.match(assignSectionIds, /serviceSection\.parentElement === hero/);
});