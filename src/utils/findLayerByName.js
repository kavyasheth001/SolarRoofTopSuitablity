export const findLayerByName = (collection, name) => {
  // normalize once
  const targetName = name.trim().toLowerCase();

  for (const layer of collection) {
    const layerTitle = layer.title?.trim().toLowerCase();
    if (layer.type === "group") {
      const found = findLayerByName(layer.layers.items, name);
      if (found) return found;
    } else if (layerTitle === targetName) {
      return layer;
    }
  }
  return null;
};

// create find group layer version
export const findGroupLayerByName = (collection, name) => {
  // normalize once
  const targetName = name.trim().toLowerCase();
  for (const layer of collection) {
    const layerTitle = layer.title?.trim().toLowerCase();
    if (layer.type === "group") {
      if (layerTitle === targetName) {
        return layer;
      } else {
        const found = findGroupLayerByName(layer.layers.items, name);
        if (found) return found;
      }
    }
  }
  return null;
};