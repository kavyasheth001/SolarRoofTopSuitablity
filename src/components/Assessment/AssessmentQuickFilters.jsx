import { useDispatch, useSelector } from 'react-redux';
import { setFilter, setActiveQuickFilter, resetFilters } from '../../store/features/assessment/assessmentSlice';
import { QUICK_FILTERS } from './assessmentConstants';

export default function AssessmentQuickFilters() {
  const dispatch           = useDispatch();
  const activeQuickFilter  = useSelector((s) => s.assessment.activeQuickFilter);

  const handleQuick = (qf) => {
    if (activeQuickFilter === qf.id) {
      // Toggle off
      dispatch(resetFilters());
      return;
    }
    dispatch(resetFilters());
    dispatch(setFilter(qf.filters));
    dispatch(setActiveQuickFilter(qf.id));
  };

  return (
    <div className="flex flex-wrap gap-2">
      {QUICK_FILTERS.map((qf) => {
        const isActive = activeQuickFilter === qf.id;
        return (
          <button
            key={qf.id}
            onClick={() => handleQuick(qf)}
            className={`
              flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium
              border transition-all duration-150
              ${isActive
                ? 'bg-primary text-white border-primary shadow-sm'
                : 'bg-white dark:bg-boxdark text-gray-600 dark:text-gray-300 border-stroke dark:border-strokedark hover:border-primary hover:text-primary dark:hover:text-primary'}
            `}
          >
            <span className={isActive ? 'text-white' : qf.color}>{qf.icon}</span>
            {qf.label}
          </button>
        );
      })}
    </div>
  );
}
