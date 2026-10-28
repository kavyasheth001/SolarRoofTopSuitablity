// Display name of a building from its GeoServer attributes.
export function buildingName(props = {}) {
  return props.name?.trim() || props.address?.trim() || `Building #${props.bld_id ?? '?'}`;
}
