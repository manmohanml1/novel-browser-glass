export const ENVIRONMENTS = Object.freeze({
  development: Object.freeze({
    name: 'development',
    cacheApiResponses: true,
    showReleaseBadge: true
  }),
  staging: Object.freeze({
    name: 'staging',
    cacheApiResponses: true,
    showReleaseBadge: true
  }),
  production: Object.freeze({
    name: 'production',
    cacheApiResponses: true,
    showReleaseBadge: true
  })
});

export function resolveEnvironment({ hostname = '', search = '' } = {}) {
  var override = new URLSearchParams(search).get('env');
  var isLocal = hostname === 'localhost' || hostname === '127.0.0.1';

  if (isLocal && override && ENVIRONMENTS[override]) {
    return ENVIRONMENTS[override];
  }

  if (isLocal) {
    return ENVIRONMENTS.development;
  }

  if (hostname.includes('staging') || hostname.includes('preview') || hostname.includes('git-')) {
    return ENVIRONMENTS.staging;
  }

  return ENVIRONMENTS.production;
}

export function setupEnvironment(locationLike = window.location) {
  var environment = resolveEnvironment(locationLike);
  document.documentElement.dataset.environment = environment.name;
  return environment;
}
