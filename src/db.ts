import { sql } from '@vercel/postgres';

export async function createTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS profiles (
      id UUID PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      gender VARCHAR(50),
      gender_probability DECIMAL(5,2),
      sample_size INTEGER,
      age INTEGER,
      age_group VARCHAR(50),
      country_id VARCHAR(10),
      country_probability DECIMAL(5,2),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `;
  
  await sql`
    CREATE INDEX IF NOT EXISTS idx_profiles_name ON profiles(name);
    CREATE INDEX IF NOT EXISTS idx_profiles_gender ON profiles(gender);
    CREATE INDEX IF NOT EXISTS idx_profiles_country_id ON profiles(country_id);
    CREATE INDEX IF NOT EXISTS idx_profiles_age_group ON profiles(age_group);
  `;
}

export async function getProfileByName(name: string) {
  const { rows } = await sql`
    SELECT * FROM profiles WHERE name = ${name} LIMIT 1;
  `;
  return rows[0] || null;
}

export async function getProfileById(id: string) {
  const { rows } = await sql`
    SELECT * FROM profiles WHERE id = ${id} LIMIT 1;
  `;
  return rows[0] || null;
}

export async function getProfiles(filters: { gender?: string; country_id?: string; age_group?: string }) {
  let query = 'SELECT * FROM profiles WHERE 1=1';
  const params: any[] = [];
  let paramIndex = 1;

  if (filters.gender) {
    query += ` AND LOWER(gender) = LOWER($${paramIndex})`;
    params.push(filters.gender);
    paramIndex++;
  }

  if (filters.country_id) {
    query += ` AND LOWER(country_id) = LOWER($${paramIndex})`;
    params.push(filters.country_id);
    paramIndex++;
  }

  if (filters.age_group) {
    query += ` AND LOWER(age_group) = LOWER($${paramIndex})`;
    params.push(filters.age_group);
    paramIndex++;
  }

  const { rows } = await sql.query(query, params);
  return rows;
}

export async function createProfile(profile: {
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
}) {
  const { rows } = await sql`
    INSERT INTO profiles (
      id, name, gender, gender_probability, sample_size, 
      age, age_group, country_id, country_probability, created_at
    ) VALUES (
      ${profile.id}, ${profile.name}, ${profile.gender}, ${profile.gender_probability},
      ${profile.sample_size}, ${profile.age}, ${profile.age_group}, ${profile.country_id},
      ${profile.country_probability}, ${profile.created_at}
    )
    RETURNING *;
  `;
  return rows[0];
}

export async function deleteProfileById(id: string) {
  const { rows } = await sql`
    DELETE FROM profiles WHERE id = ${id} RETURNING *;
  `;
  return rows[0] || null;
}