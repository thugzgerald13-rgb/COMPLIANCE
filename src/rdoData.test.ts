import { describe, expect, it } from 'vitest';
import { birRDOList, getRDODetails, getRDOLocationDisplay } from './rdoData';

describe('birRDOList', () => {
  it('exposes a non-empty catalogue where every entry is fully populated', () => {
    expect(birRDOList.length).toBeGreaterThan(0);
    for (const rdo of birRDOList) {
      expect(rdo.code).toMatch(/^\d{3}[AB]?$/);
      expect(rdo.name).toBe(`RDO No. ${rdo.code}`);
      expect(rdo.location.length).toBeGreaterThan(0);
      expect(rdo.region && rdo.region.length).toBeTruthy();
    }
  });
});

describe('getRDODetails', () => {
  it('finds an RDO by its exact code', () => {
    expect(getRDODetails('044')).toMatchObject({ code: '044', location: 'Taguig City / Pateros' });
  });

  it('normalizes surrounding whitespace and casing', () => {
    expect(getRDODetails('  017a  ')).toMatchObject({ code: '017A', location: 'Bayombong, Nueva Vizcaya' });
    expect(getRDODetails('093b')).toMatchObject({ code: '093B' });
  });

  it('returns undefined for empty or unknown codes', () => {
    expect(getRDODetails('')).toBeUndefined();
    expect(getRDODetails('999')).toBeUndefined();
    expect(getRDODetails('44')).toBeUndefined();
  });

  it('returns the first match when a code is listed more than once', () => {
    // Codes 047/048 appear under both East NCR and Makati City
    const duplicates = birRDOList.filter(r => r.code === '047');
    expect(duplicates.length).toBeGreaterThan(1);
    expect(getRDODetails('047')).toBe(duplicates[0]);
  });
});

describe('getRDOLocationDisplay', () => {
  it('returns the location for a known code', () => {
    expect(getRDOLocationDisplay('008')).toBe('Baguio City, Benguet');
  });

  it('falls back to a generic label for unknown codes', () => {
    expect(getRDOLocationDisplay('999')).toBe('RDO 999');
    expect(getRDOLocationDisplay('')).toBe('RDO ');
  });
});
