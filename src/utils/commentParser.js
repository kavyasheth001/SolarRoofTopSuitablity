/**
 * Parses field change comments formatted as: field_name[old_value -> new_value]
 * Supports multiple changes separated by newlines.
 * 
 * @param {string} text - The raw comment text
 * @returns {Array|null} Array of change objects { field, before, after } or null if no matches
 */
export function parseFieldChanges(text) {
  if (!text) return null;
  
  // The pattern matches: fieldname[old -> new]
  // It handles multiple changes in the same line (comma or space separated)
  const pattern = /(\w+)\[(.*?)\s*->\s*(.*?)\]/g;
  
  const changes = [];
  let match;
  
  while ((match = pattern.exec(text)) !== null) {
    changes.push({
      field: match[1],
      before: match[2],
      after: match[3]
    });
  }
    
  if (changes.length === 0) return null;
  return changes;
}
