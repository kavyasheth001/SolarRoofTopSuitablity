import { PRIORITY_COLORS, PRIORITY_DOT, STATUS_COLORS } from './assessmentConstants';
import { TbBuildingSkyscraper } from 'react-icons/tb';
import { FiMapPin, FiCalendar } from 'react-icons/fi';

/**
 * Single building card in the list panel.
 * Shows: name, ward, UID, floors, priority badge, schedule status (if any).
 */
export default function AssessmentBuildingCard({ building, isSelected, onClick }) {
  const {
    name, ward, uid, sac_number, no_floors, sub_class,
    priority, priorityScore, scheduleStatus,
  } = building;

  const priorityBadge = PRIORITY_COLORS[priority] || PRIORITY_COLORS.LOW;
  const dot           = PRIORITY_DOT[priority]    || PRIORITY_DOT.LOW;
  const statusBadge   = scheduleStatus ? STATUS_COLORS[scheduleStatus] : null;

  return (
    <div
      onClick={() => onClick(building)}
      className={`
        group relative flex gap-3 p-3 rounded-xl border cursor-pointer transition-all duration-150
        ${isSelected
          ? 'border-primary bg-primary/5 dark:bg-primary/10 shadow-sm'
          : 'border-stroke dark:border-strokedark bg-white dark:bg-boxdark hover:border-primary/50 hover:shadow-sm'}
      `}
    >
      {/* Priority dot indicator */}
      <div className={`absolute top-3 right-3 w-2 h-2 rounded-full ${dot}`} title={`${priority || 'LOW'} priority`} />

      {/* Building icon */}
      <div className={`
        flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center
        ${isSelected ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-meta-4 text-gray-500 dark:text-gray-400'}
      `}>
        <TbBuildingSkyscraper size={20} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pr-4">
        <p className={`text-sm font-semibold truncate ${isSelected ? 'text-primary' : 'text-gray-800 dark:text-gray-100'}`}>
          {name || 'Unnamed Building'}
        </p>

        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          {ward && (
            <span className="flex items-center gap-0.5 text-xs text-gray-500 dark:text-gray-400">
              <FiMapPin size={10} /> {ward} Ward
            </span>
          )}
          {no_floors != null && (
            <span className="text-xs text-gray-400 dark:text-gray-500">· {no_floors} floors</span>
          )}
        </div>

        {uid && (
          <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5 truncate">UID: {uid}</p>
        )}

        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          {/* Priority badge */}
          {priority && (
            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold ${priorityBadge}`}>
              {priority}
            </span>
          )}

          {/* Schedule status badge */}
          {statusBadge && (
            <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium ${statusBadge}`}>
              <FiCalendar size={9} /> {scheduleStatus}
            </span>
          )}

          {/* SAC indicator */}
          {!sac_number && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400">
              No SAC
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
