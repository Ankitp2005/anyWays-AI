const ALLOWED_ORIGIN = Deno.env.get('ENVIRONMENT') === 'production' 
  ? 'https://anyways.ai' // Replace with your actual production domain
  : '*';

export const corsHeaders = {
  'Access-Control-Allow-Origin':  ALLOWED_ORIGIN,
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key, x-trace-id, x-correlation-id, x-simulation, x-environment',
};
