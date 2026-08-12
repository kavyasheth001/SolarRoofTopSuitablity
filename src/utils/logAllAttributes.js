// =============================================================================
// UTILITY: logAllAttributes
// Logs all fields and sample feature attributes for any ArcGIS layer.
// =============================================================================

/**
 * Logs all fields and sample feature attributes for a given ArcGIS layer.
 *
 * @param {Object} layer      - A loaded (or loadable) ArcGIS FeatureLayer instance.
 * @param {Object} [options]
 * @param {string} [options.label]      - Custom label shown in the console group header.
 * @param {number} [options.sampleSize] - Number of sample features to query (default: 5).
 */
export async function logAllAttributes(layer, { label, sampleSize = 5 } = {}) {
  if (!layer) {
    console.warn('logAllAttributes: No layer provided.')
    return
  }

  if (!layer.loaded) {
    try {
      await layer.load()
    } catch (e) {
      console.warn(`logAllAttributes: Failed to load layer "${layer.title}":`, e)
      return
    }
  }

  const groupLabel = label || `🗂️ ${layer.title || layer.id} — Attributes Debug`

  console.group(groupLabel)

  // 1. Fields
  if (layer.fields && layer.fields.length > 0) {
    console.log('📋 Fields:')
    console.table(
      layer.fields.map((f) => ({
        name: f.name,
        alias: f.alias,
        type: f.type,
      }))
    )
  } else {
    console.warn('⚠️ No fields found on this layer.')
  }

  // 2. Sample features
  try {
    const q = layer.createQuery()
    q.where = '1=1'
    q.outFields = ['*']
    q.returnGeometry = false
    q.num = sampleSize

    const result = await layer.queryFeatures(q)
    console.log(`📦 Sample features (${result.features.length} of up to ${sampleSize}):`)
    result.features.forEach((f, i) => {
      console.log(`  Feature ${i + 1}:`, f.attributes)
    })
  } catch (e) {
    console.warn('⚠️ Could not query sample features:', e)
  }

  console.groupEnd()
}

// useEffect(() => {
//   if (!map) return
//   const layer = findLayerByName(map.layers.items, LAYER_NAMES.TAX_POINTS)
//   logAllAttributes(layer, { label: '🏠 Building_Property_Tax_Point — Attributes Debug' })
// }, [map])