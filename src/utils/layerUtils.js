/**
 * Layer Management Utility Functions - Two Ref Pattern with Sibling Support
 *
 * TWO REF APPROACH:
 * 1. originalStateRef - stores state BEFORE any modifications (true original)
 * 2. currentStateRef - tracks current state after initialization (all hidden)
 *
 * When showing/hiding layers:
 * - Target child layer visibility changes
 * - Parent visibility is managed based on children state
 * - Sibling layers are hidden during initialization and restored on cleanup
 */

/**
 * Find parent layer in the map hierarchy
 */
export const findParentLayer = (layer, map) => {
  if (!layer || !map) return null;

  const findInCollection = (collection, targetLayer) => {
    for (const item of collection) {
      if (item.type === 'group') {
        const isDirectChild = item.layers?.items?.some(
          (child) => child.id === targetLayer.id,
        );

        if (isDirectChild) {
          return item;
        }

        const found = findInCollection(item.layers?.items || [], targetLayer);
        if (found) return found;
      }
    }
    return null;
  };

  return findInCollection(map.layers?.items || [], layer);
};

/**
 * Find all child layers (for group layers)
 */
export const findChildLayers = (layer) => {
  if (!layer) return [];

  if (layer.type === 'group' && layer.layers) {
    return layer.layers.items || [];
  }
  return [];
};

/**
 * Find all sibling layers (layers that share the same parent)
 */
export const findSiblingLayers = (layer, parent) => {
  if (!layer || !parent) return [];
  
  const children = findChildLayers(parent);
  // Return all children except the target layer itself
  return children.filter((child) => child.id !== layer.id);
};

/**
 * Clone renderer to preserve original
 */
export const cloneRenderer = (renderer) => {
  if (!renderer) return null;

  try {
    return renderer.clone
      ? renderer.clone()
      : JSON.parse(JSON.stringify(renderer));
  } catch (e) {
    console.warn('Could not clone renderer', e);
    return null;
  }
};

/**
 * Extract object IDs from features
 */
export const extractObjectIds = (features, objectIdField = 'OBJECTID') => {
  if (!features || features.length === 0) return [];

  const objectIds = features
    .map((feature) => {
      return (
        feature.attributes?.[objectIdField] ||
        feature.attributes?.objectid ||
        feature.attributes?.OBJECTID ||
        feature.attributes?.id ||
        feature.attributes?.ID
      );
    })
    .filter((id) => id !== undefined && id !== null);

  return objectIds;
};

/**
 * Create definition expression from object IDs
 */
export const createDefinitionExpression = (
  objectIds,
  objectIdField = 'OBJECTID',
) => {
  if (!objectIds || objectIds.length === 0) return null;
  return `${objectIdField} IN (${objectIds.join(',')})`;
};

/**
 * Capture layer state snapshot
 * @param {Layer} layer - The layer to capture state for
 * @returns {Object} - State snapshot
 */
export const captureLayerState = (layer) => {
  if (!layer) return null;

  return {
    layerId: layer.id,
    layerTitle: layer.title,
    visible: layer.visible,
    definitionExpression: layer.definitionExpression || null,
    renderer: layer.renderer ? cloneRenderer(layer.renderer) : null,
  };
};

/**
 * Initialize layer - TWO REF PATTERN with SIBLING SUPPORT
 * Returns both original state (before any changes) and prepared state objects
 *
 * @param {Layer} layer - The target layer
 * @param {Map} map - The ArcGIS map object
 * @returns {Object} - { originalState, currentState }
 */
export const initializeLayerWithTwoStates = (layer, map) => {
  if (!layer || !map) {
    console.warn('Layer or map not provided for initialization');
    return null;
  }

  // Find parent, children, and siblings
  const parent = findParentLayer(layer, map);
  const children = findChildLayers(layer);
  const siblings = findSiblingLayers(layer, parent);

  // STEP 1: Capture ORIGINAL state (before any modifications)
  const originalState = {
    layer: layer,
    layerState: captureLayerState(layer),
    parent: parent,
    parentState: parent ? captureLayerState(parent) : null,
    children: children,
    childrenStates: children.map((child) => captureLayerState(child)),
    siblings: siblings,
    siblingsStates: siblings.map((sibling) => captureLayerState(sibling)),
  };

  // STEP 2: Hide the target layer, all children, AND all siblings
  layer.visible = false;
  children.forEach((child) => {
    child.visible = false;
  });
  siblings.forEach((sibling) => {
    sibling.visible = false;
  });

  // STEP 3: Capture CURRENT state (after hiding)
  const currentState = {
    layer: layer,
    layerState: captureLayerState(layer),
    parent: parent,
    parentState: parent ? captureLayerState(parent) : null,
    children: children,
    childrenStates: children.map((child) => captureLayerState(child)),
    siblings: siblings,
    siblingsStates: siblings.map((sibling) => captureLayerState(sibling)),
  };

  console.log(`Layer initialized: ${layer.title}`, {
    hasParent: !!parent,
    parentTitle: parent?.title,
    childrenCount: children.length,
    siblingsCount: siblings.length,
    siblingsTitles: siblings.map(s => s.title),
    originalVisibility: originalState.layerState.visible,
    currentVisibility: currentState.layerState.visible,
  });

  return { originalState, currentState };
};

/**
 * Show layer with filter - Shows target layer AND ensures parent is visible
 * Siblings remain hidden (not modified from their current state)
 *
 * @param {Layer} layer - The layer to show
 * @param {Array<Graphic>} features - Features to show
 * @param {string} objectIdField - Field name for object IDs
 * @param {Object} currentStateRef - Current state ref to update
 * @returns {boolean} - Success status
 */
export const showLayerWithFilter = (
  layer,
  features,
  objectIdField = 'OBJECTID',
  currentStateRef = null,
) => {
  if (!layer) {
    console.warn('Layer not provided');
    return false;
  }

  if (!features || features.length === 0) {
    console.warn(`No features provided for layer ${layer.title}`);
    return false;
  }

  // Extract object IDs
  const objectIds = extractObjectIds(features, objectIdField);

  if (objectIds.length === 0) {
    console.warn(`No valid object IDs found for layer ${layer.title}`);
    return false;
  }

  // Create definition expression
  const definitionExpression = createDefinitionExpression(
    objectIds,
    objectIdField,
  );

  // Modify the target layer
  layer.definitionExpression = definitionExpression;
  layer.visible = true;

  // IMPORTANT: Ensure parent layer is also visible
  if (currentStateRef?.parent) {
    currentStateRef.parent.visible = true;
    // Update parent state in currentStateRef
    currentStateRef.parentState = captureLayerState(currentStateRef.parent);
  }

  // Update currentStateRef if provided
  if (currentStateRef) {
    currentStateRef.layerState = captureLayerState(layer);
  }

  console.log(`Layer ${layer.title} shown with ${objectIds.length} features`);
  console.log(`Siblings remain hidden: ${currentStateRef?.siblings?.length || 0} sibling(s)`);

  return true;
};

/**
 * Show layer without filter - Shows entire layer AND ensures parent is visible
 * Siblings remain hidden (not modified from their current state)
 *
 * @param {Layer} layer - The layer to show
 * @param {Object} currentStateRef - Current state ref to update
 * @returns {boolean} - Success status
 */
export const showLayer = (layer, currentStateRef = null) => {
  if (!layer) {
    console.warn('Layer not provided');
    return false;
  }

  // Remove any existing filter and show the layer
  layer.definitionExpression = null;
  layer.visible = true;

  // IMPORTANT: Ensure parent layer is also visible
  if (currentStateRef?.parent) {
    currentStateRef.parent.visible = true;
    // Update parent state in currentStateRef
    currentStateRef.parentState = captureLayerState(currentStateRef.parent);
  }

  // Update currentStateRef if provided
  if (currentStateRef) {
    currentStateRef.layerState = captureLayerState(layer);
  }

  console.log(`Layer ${layer.title} shown without filter (all features visible)`);
  console.log(`Siblings remain hidden: ${currentStateRef?.siblings?.length || 0} sibling(s)`);

  return true;
}

/**
 * Hide layer - Hides target layer AND parent if all siblings AND target are hidden
 *
 * @param {Layer} layer - The layer to hide
 * @param {Object} currentStateRef - Current state ref to update
 * @returns {boolean} - Success status
 */
export const hideLayer = (layer, currentStateRef = null) => {
  if (!layer) {
    console.warn('Layer not provided');
    return false;
  }

  // Hide the target layer
  layer.visible = false;
  layer.definitionExpression = null;

  // Check if we should hide the parent
  if (currentStateRef?.parent && currentStateRef?.siblings) {
    // Check if all siblings are hidden (target is already hidden above)
    const allSiblingsHidden = currentStateRef.siblings.every(
      (sibling) => !sibling.visible,
    );

    if (allSiblingsHidden) {
      currentStateRef.parent.visible = false;
      // Update parent state
      currentStateRef.parentState = captureLayerState(currentStateRef.parent);
      console.log(
        `Parent layer ${currentStateRef.parent.title} hidden (all children hidden)`,
      );
    }
  }

  // Update currentStateRef if provided
  if (currentStateRef) {
    currentStateRef.layerState = captureLayerState(layer);
  }

  console.log(`Layer ${layer.title} hidden`);

  return true;
};

/**
 * Restore layer to original state
 * Restores layer, parent, children, and siblings to their original states
 *
 * @param {Object} originalState - Original state object from initialization
 * @returns {boolean} - Success status
 */
export const restoreToOriginalState = (originalState) => {
  if (!originalState) {
    console.warn('Original state not provided');
    return false;
  }

  const { 
    layer, 
    layerState, 
    parent, 
    parentState, 
    children, 
    childrenStates,
    siblings,
    siblingsStates 
  } = originalState;

  // Restore target layer
  if (layer && layerState) {
    layer.visible = layerState.visible;
    layer.definitionExpression = layerState.definitionExpression;
    if (layerState.renderer) {
      layer.renderer = layerState.renderer;
    }
  }

  // Restore parent
  if (parent && parentState) {
    parent.visible = parentState.visible;
    parent.definitionExpression = parentState.definitionExpression;
    if (parentState.renderer) {
      parent.renderer = parentState.renderer;
    }
  }

  // Restore children
  if (children && childrenStates) {
    children.forEach((child, index) => {
      const childState = childrenStates[index];
      if (childState) {
        child.visible = childState.visible;
        child.definitionExpression = childState.definitionExpression;
        if (childState.renderer) {
          child.renderer = childState.renderer;
        }
      }
    });
  }

  // Restore siblings
  if (siblings && siblingsStates) {
    siblings.forEach((sibling, index) => {
      const siblingState = siblingsStates[index];
      if (siblingState) {
        sibling.visible = siblingState.visible;
        sibling.definitionExpression = siblingState.definitionExpression;
        if (siblingState.renderer) {
          sibling.renderer = siblingState.renderer;
        }
      }
    });
  }

  console.log(`Layer ${layer?.title} restored to original state (including ${siblings?.length || 0} siblings)`);

  return true;
};

/**
 * Get layer hierarchy info (for debugging)
 */
export const getLayerHierarchyInfo = (layer, map) => {
  if (!layer) return null;

  const parent = map ? findParentLayer(layer, map) : null;
  const children = findChildLayers(layer);
  const siblings = findSiblingLayers(layer, parent);

  return {
    layerTitle: layer.title,
    layerId: layer.id,
    currentVisibility: layer.visible,
    hasParent: !!parent,
    parentTitle: parent?.title || null,
    parentId: parent?.id || null,
    parentVisibility: parent?.visible || null,
    hasChildren: children.length > 0,
    childrenCount: children.length,
    childrenTitles: children.map((c) => c.title),
    childrenVisibility: children.map((c) => c.visible),
    hasSiblings: siblings.length > 0,
    siblingsCount: siblings.length,
    siblingsTitles: siblings.map((s) => s.title),
    siblingsVisibility: siblings.map((s) => s.visible),
  };
};