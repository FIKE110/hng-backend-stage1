import { v7 as uuidv7 } from 'uuid';

const GENDERIZE_API = 'https://api.genderize.io';
const AGIFY_API = 'https://api.agify.io';
const NATIONALIZE_API = 'https://api.nationalize.io';

interface GenderizeResponse {
  name: string;
  gender: string | null;
  probability: number;
  count: number;
}

interface AgifyResponse {
  name: string;
  age: number | null;
  count: number;
}

interface NationalizeResponse {
  name: string;
  country: Array<{ country_id: string; probability: number }>;
}

function classifyAgeGroup(age: number): string {
  if (age <= 12) return 'child';
  if (age <= 19) return 'teenager';
  if (age <= 59) return 'adult';
  return 'senior';
}

function getHighestProbabilityCountry(
  countries: Array<{ country_id: string; probability: number }>
): { country_id: string; probability: number } | null {
  if (!countries || countries.length === 0) return null;
  return countries.reduce((highest, current) =>
    current.probability > highest.probability ? current : highest
  );
}

export async function fetchGenderize(name: string): Promise<GenderizeResponse> {
  const response = await fetch(`${GENDERIZE_API}?name=${encodeURIComponent(name)}`);
  if (!response.ok) {
    throw new Error('Genderize returned an invalid response');
  }
  return response.json();
}

export async function fetchAgify(name: string): Promise<AgifyResponse> {
  const response = await fetch(`${AGIFY_API}?name=${encodeURIComponent(name)}`);
  if (!response.ok) {
    throw new Error('Agify returned an invalid response');
  }
  return response.json();
}

export async function fetchNationalize(name: string): Promise<NationalizeResponse> {
  const response = await fetch(`${NATIONALIZE_API}?name=${encodeURIComponent(name)}`);
  if (!response.ok) {
    throw new Error('Nationalize returned an invalid response');
  }
  return response.json();
}

export interface ProfileData {
  id: string;
  name: string;
  gender: string;
  gender_probability: number;
  sample_size: number;
  age: number;
  age_group: string;
  country_id: string;
  country_probability: number;
  created_at: string;
}

export async function enrichAndProcessProfile(name: string): Promise<ProfileData> {
  const [genderizeData, agifyData, nationalizeData] = await Promise.all([
    fetchGenderize(name),
    fetchAgify(name),
    fetchNationalize(name),
  ]);

  if (genderizeData.gender === null || genderizeData.count === 0) {
    throw { status: '502', message: 'Genderize returned an invalid response' };
  }

  if (agifyData.age === null) {
    throw { status: '502', message: 'Agify returned an invalid response' };
  }

  if (!nationalizeData.country || nationalizeData.country.length === 0) {
    throw { status: '502', message: 'Nationalize returned an invalid response' };
  }

  const country = getHighestProbabilityCountry(nationalizeData.country);

  return {
    id: uuidv7(),
    name: name.toLowerCase(),
    gender: genderizeData.gender,
    gender_probability: genderizeData.probability,
    sample_size: genderizeData.count,
    age: agifyData.age,
    age_group: classifyAgeGroup(agifyData.age),
    country_id: country?.country_id || '',
    country_probability: country?.probability || 0,
    created_at: new Date().toISOString(),
  };
}