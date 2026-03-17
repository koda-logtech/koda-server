export const getEnvironment = () => ({
  port: process.env.PORT || 3000,
  enviroment: process.env.NODE_ENV || 'development',
  supabase: {
    url: process.env.SUPABASE_URL,
    apiKey: process.env.SUPABASE_API_KEY,
  },
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
  },
  api: {
    title: process.env.API_TITLE || 'Koda API',
    version: process.env.API_VERSION || '1.0.0',
  },
});
