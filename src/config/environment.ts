export const getEnvironment = () => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is not set');
  }

  return {
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
    jwt: {
      secret: process.env.JWT_SECRET,
      expiresIn: process.env.JWT_EXPIRY || '1h',
      refreshExpiresIn: process.env.JWT_REFRESH_EXPIRY || '7d',
    },
  };
};
