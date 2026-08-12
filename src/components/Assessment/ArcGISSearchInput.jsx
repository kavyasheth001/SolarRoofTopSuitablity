import { useEffect, useRef } from 'react';
import Search from '@arcgis/core/widgets/Search';
import '@arcgis/core/assets/esri/themes/light/main.css';

export default function ArcGISSearchInput({ view }) {
  const containerRef = useRef(null);
  const searchWidgetRef = useRef(null);

  useEffect(() => {
    if (!view || !containerRef.current) return;

    if (!searchWidgetRef.current) {
      searchWidgetRef.current = new Search({
        view: view,
        container: containerRef.current,
        includeDefaultSources: true,
        searchAllEnabled: true,
        suggestionsEnabled: true,
        minSuggestCharacters: 3,
        maxSuggestions: 6,
        popupEnabled: false,
      });
    }

    return () => {
      if (searchWidgetRef.current) {
        searchWidgetRef.current.destroy();
        searchWidgetRef.current = null;
      }
    };
  }, [view]);

  return (
    <div 
      ref={containerRef} 
      className="w-72 search-widget-custom border border-stroke dark:border-strokedark rounded-lg overflow-hidden shadow-sm" 
      style={{ minHeight: '38px' }}
    />
  );
}
