import { useDispatch, useSelector } from 'react-redux';
import { setSelectedBuilding, fetchBuildingOutstanding, hasOutstandingFilters } from '../../store/features/assessment/assessmentSlice';
import AssessmentBuildingCard from './AssessmentBuildingCard';
import { computePriority, sortByPriority } from '../../utils/assessmentPriorityEngine';
import { BeatLoader } from 'react-spinners';
import { FiSearch } from 'react-icons/fi';

export default function AssessmentBuildingList() {
  const dispatch         = useDispatch();
  const buildings        = useSelector((s) => s.assessment.buildings);
  const buildingsLoading = useSelector((s) => s.assessment.buildingsLoading);
  const selectedBuilding = useSelector((s) => s.assessment.selectedBuilding);
  const searchQuery      = useSelector((s) => s.assessment.searchQuery);
  const filters          = useSelector((s) => s.assessment.filters);
  const outstandingFilterData = useSelector((s) => s.assessment.outstandingFilterData);
  const outstandingFilterLoading = useSelector((s) => s.assessment.outstandingFilterLoading);

  // Client-side search filter on top of server-side results
  const filtered = searchQuery
    ? buildings.filter((b) => {
        const q = searchQuery.toLowerCase();
        return (
          (b.name        || '').toLowerCase().includes(q) ||
          (b.uid         || '').toLowerCase().includes(q) ||
          (b.sac_number  || '').toLowerCase().includes(q) ||
          (b.ward        || '').toLowerCase().includes(q) ||
          (b.address     || '').toLowerCase().includes(q)
        );
      })
    : buildings;

  // If outstanding filters are active, ONLY include buildings that were returned by the API
  const isOutstandingFiltered = hasOutstandingFilters(filters);
  const finalFiltered = isOutstandingFiltered
    ? filtered.filter((b) => b.sac_number && outstandingFilterData[b.sac_number])
    : filtered;

  // Enrich with priority and outstanding data
  const enrichedBuildings = finalFiltered.map((b) => {
    const outData = b.sac_number ? outstandingFilterData[b.sac_number] : null;
    const { score, priority } = computePriority(b, outData);
    return { ...b, priorityScore: score, priority };
  });

  const sortedBuildings = sortByPriority(enrichedBuildings);

  const handleSelect = (building) => {
    dispatch(setSelectedBuilding(building));

    // Lazy load outstanding data when a building is selected
    if (building.sac_number) {
      dispatch(fetchBuildingOutstanding({
        objectId:      building.gis_object_id,
        sac_composite: building.sac_number,
      }));
    }
  };

  if (buildingsLoading || outstandingFilterLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <BeatLoader color="#2563eb" size={10} />
        <p className="text-sm text-gray-400 dark:text-gray-500">
          {outstandingFilterLoading ? 'Applying Outstanding Filters…' : 'Loading buildings…'}
        </p>
      </div>
    );
  }

  if (!buildingsLoading && !outstandingFilterLoading && finalFiltered.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 text-center p-4">
        <div className="w-12 h-12 bg-gray-100 dark:bg-meta-4 rounded-full flex items-center justify-center">
          <FiSearch size={20} className="text-gray-400" />
        </div>
        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">No buildings found</p>
        <p className="text-xs text-gray-400 dark:text-gray-500">Try adjusting the filters or search query</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 overflow-y-auto pr-1">
      <div className="flex items-center justify-between px-1 mb-1">
        <span className="text-xs text-gray-400 dark:text-gray-500">
          {sortedBuildings.length} building{sortedBuildings.length !== 1 ? 's' : ''}
        </span>
      </div>

      {sortedBuildings.map((building) => (
        <AssessmentBuildingCard
          key={building.gis_object_id || building.uid || building.name}
          building={building}
          isSelected={selectedBuilding?.gis_object_id === building.gis_object_id}
          onClick={handleSelect}
        />
      ))}
    </div>
  );
}
