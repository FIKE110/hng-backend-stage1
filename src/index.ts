import 'dotenv/config';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serve } from '@hono/node-server';
import { createTable, getProfileByName, getProfileById, getProfiles, createProfile, deleteProfileById } from './db';
import { enrichAndProcessProfile } from './profileService';

type Env = {
  Bindings: {
    DB: any;
  };
};

const app = new Hono<Env>();

console.log('Server starting on http://localhost:3000');

app.get('/', (c) => {
  return c.json({ 
    status: 'success', 
    message: 'Profile Intelligence Service is running',
    endpoints: ['POST /api/profiles', 'GET /api/profiles', 'GET /api/profiles/:id', 'DELETE /api/profiles/:id']
  });
});

app.use('*', cors({
  origin: '*',
}));

createTable();

app.notFound((c) => {
  return c.json({ status: 'error', message: 'Not Found' }, 404);
});

app.onError((c: any, err) => {
  console.error('Server error:', err);
  return c.json({ status: 'error', message: 'Internal Server Error' }, 500);
});

app.post('/api/profiles', async (c) => {
  try {
    const body = await c.req.json();
    const { name } = body;

    if (!name || typeof name !== 'string' || name.trim() === '') {
      return c.json({ status: 'error', message: 'Missing or empty name' }, 400);
    }

    const trimmedName = name.trim().toLowerCase();
    const existing = await getProfileByName(trimmedName);

    if (existing) {
      return c.json({
        status: 'success',
        message: 'Profile already exists',
        data: {
          id: existing.id,
          name: existing.name,
          gender: existing.gender,
          gender_probability: Number(existing.gender_probability),
          sample_size: existing.sample_size,
          age: existing.age,
          age_group: existing.age_group,
          country_id: existing.country_id,
          country_probability: Number(existing.country_probability),
          created_at: existing.created_at,
        },
      }, 200);
    }

    const profileData = await enrichAndProcessProfile(trimmedName);
    const savedProfile = await createProfile(profileData);

    return c.json({
      status: 'success',
      data: {
        id: savedProfile.id,
        name: savedProfile.name,
        gender: savedProfile.gender,
        gender_probability: Number(savedProfile.gender_probability),
        sample_size: savedProfile.sample_size,
        age: savedProfile.age,
        age_group: savedProfile.age_group,
        country_id: savedProfile.country_id,
        country_probability: Number(savedProfile.country_probability),
        created_at: savedProfile.created_at,
      },
    }, 201);
  } catch (error) {
    const err = error as { status?: string; message?: string };
    if (err.status === '502') {
      return c.json({ status: '502', message: err.message }, 502);
    }
    console.error('Error creating profile:', error);
    return c.json({ status: 'error', message: 'Internal Server Error' }, 500);
  }
});

app.get('/api/profiles', async (c) => {
  try {
    const gender = c.req.query('gender');
    const country_id = c.req.query('country_id');
    const age_group = c.req.query('age_group');

    const profiles = await getProfiles({
      gender: gender || undefined,
      country_id: country_id || undefined,
      age_group: age_group || undefined,
    });

    const simplifiedProfiles = profiles.map((p: any) => ({
      id: p.id,
      name: p.name,
      gender: p.gender,
      age: p.age,
      age_group: p.age_group,
      country_id: p.country_id,
    }));

    return c.json({
      status: 'success',
      count: profiles.length,
      data: simplifiedProfiles,
    }, 200);
  } catch (error: any) {
    console.error('Error fetching profiles:', error);
    return c.json({ status: 'error', message: 'Internal Server Error' }, 500);
  }
});

app.get('/api/profiles/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const profile = await getProfileById(id);

    if (!profile) {
      return c.json({ status: 'error', message: 'Profile not found' }, 404);
    }

    return c.json({
      status: 'success',
      data: {
        id: profile.id,
        name: profile.name,
        gender: profile.gender,
        gender_probability: Number(profile.gender_probability),
        sample_size: profile.sample_size,
        age: profile.age,
        age_group: profile.age_group,
        country_id: profile.country_id,
        country_probability: Number(profile.country_probability),
        created_at: profile.created_at,
      },
    }, 200);
  } catch (error: any) {
    console.error('Error fetching profile:', error);
    return c.json({ status: 'error', message: 'Internal Server Error' }, 500);
  }
});

app.delete('/api/profiles/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const deleted = await deleteProfileById(id);

    if (!deleted) {
      return c.json({ status: 'error', message: 'Profile not found' }, 404);
    }

    return c.status(204);
  } catch (error: any) {
    console.error('Error deleting profile:', error);
    return c.json({ status: 'error', message: 'Internal Server Error' }, 500);
  }
});

serve({
  fetch: app.fetch,
  port: 3000,
});

export default app;