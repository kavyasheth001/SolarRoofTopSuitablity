/**
 * Recursively walks the view.map.layers to extract all individual layer/sublayer records.
 * Returns a flat array of layer records containing basic metadata.
 * 
 * @param {Object} view - The ArcGIS SceneView or MapView instance
 * @returns {Array} Array of layer records
 */
export function harvestLayers(view) {
  if (!view?.map?.allLayers) return [];

  const records = [];

  // Helper to extract department from title (simple prefix matching for now)
  const getDepartment = (title = '') => {
    const lower = title.toLowerCase();
    if (lower.includes('road')) return 'Roads';
    if (lower.includes('water') || lower.includes('hydraulic')) return 'Hydraulic';
    if (lower.includes('fire')) return 'Fire';
    if (lower.includes('bridge')) return 'Bridges';
    if (lower.includes('build') || lower.includes('buid')) return 'Building';
    if (lower.includes('sewer')) return 'Sewerage';
    if (lower.includes('storm')) return 'Storm Water';
    if (lower.includes('license')) return 'License';
    if (lower.includes('tree') || lower.includes('garden')) return 'Trees & Garden';
    if (lower.includes('disaster')) return 'Disaster';
    if (lower.includes('pollut') || lower.includes('environment')) return 'Environment';
    if (lower.includes('assess')) return 'Assessment';
    return 'General'; // fallback
  };

  view.map.allLayers.forEach((layer) => {
    // Determine the parent title if it belongs to a group layer
    let parentTitle = null;
    if (layer.parent && layer.parent.type === 'group') {
      parentTitle = layer.parent.title;
    }

    records.push({
      id: layer.id,
      title: layer.title,
      type: layer.type,
      url: layer.url || null,
      parentTitle: parentTitle,
      visible: layer.visible,
      loadStatus: layer.loadStatus,
      loadError: layer.loadError?.message || null,
      department: getDepartment(layer.title),
    });

    // Sublayers for MapImageLayer are NOT in allLayers, so we must add them manually
    if (layer.type === 'map-image' && layer.allSublayers) {
      layer.allSublayers.forEach((sublayer) => {
        records.push({
          id: sublayer.id || `${layer.id}-${sublayer.id}`,
          title: sublayer.title,
          type: 'sublayer',
          url: layer.url, // inherits parent URL
          sublayerId: sublayer.id,
          parentTitle: layer.title, // Parent is the MapImageLayer
          visible: sublayer.visible,
          loadStatus: layer.loadStatus, // inherits parent load status
          loadError: layer.loadError?.message || null,
          department: getDepartment(sublayer.title) || getDepartment(layer.title),
        });
      });
    }
  });

  return records;
}
