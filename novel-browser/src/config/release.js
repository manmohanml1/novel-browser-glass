export const release = Object.freeze({
  version: 'v0.2.2',
  type: 'fix',
  label: 'Patch release'
});

export function formatReleaseBadge(version, environmentName) {
  return environmentName === 'production' ? version : version + ' ' + environmentName;
}
