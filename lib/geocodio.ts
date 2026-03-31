export interface DistrictResult {
  state: string;
  districts: Array<{
    number: number;
    proportion: number;
  }>;
}

export async function lookupDistrict(zip: string): Promise<DistrictResult | null> {
  const res = await fetch(
    `https://api.geocod.io/v1.12/geocode?q=${encodeURIComponent(zip)}&fields=cd&api_key=${process.env.GEOCODIO_KEY}&format=json`
  );

  if (!res.ok) return null;

  const data = await res.json();
  const results = data.results;
  if (!results || results.length === 0) return null;

  const result = results[0];
  const state = result.address_components?.state || "";
  const cds = result.fields?.congressional_districts || [];

  if (!state || cds.length === 0) return null;

  const districts = cds.map((cd: any) => ({
    number: cd.district_number,
    proportion: cd.proportion,
  }));

  // Sort by proportion descending
  districts.sort((a: any, b: any) => b.proportion - a.proportion);

  return { state: state.toLowerCase(), districts };
}
