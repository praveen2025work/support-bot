export const config = {
  apiBaseUrl: process.env.API_BASE_URL || 'http://localhost:8080/api',
  apiToken: process.env.API_TOKEN || '',
  teamsAppId: process.env.TEAMS_APP_ID || '',
  teamsAppPassword: process.env.TEAMS_APP_PASSWORD || '',
  nodeEnv: process.env.NODE_ENV || 'development',
  isDev: process.env.NODE_ENV !== 'production',
};
