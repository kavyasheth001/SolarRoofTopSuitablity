import { useSelector } from 'react-redux';
import { TbBuildingSkyscraper } from 'react-icons/tb';
import { MdOutlineSchedule, MdOutlineCheckCircle, MdOutlineWarning } from 'react-icons/md';
import { FiAlertTriangle, FiList } from 'react-icons/fi';
import { BeatLoader } from 'react-spinners';

const cards = [
  {
    key:   'total_scheduled',
    label: 'Total Scheduled',
    icon:  <FiList size={22} />,
    bg:    'bg-blue-50 dark:bg-blue-900/20',
    icon_color: 'text-blue-600 dark:text-blue-400',
    border: 'border-l-blue-500',
  },
  {
    key:   'pending',
    label: 'Pending',
    icon:  <MdOutlineSchedule size={22} />,
    bg:    'bg-amber-50 dark:bg-amber-900/20',
    icon_color: 'text-amber-600 dark:text-amber-400',
    border: 'border-l-amber-500',
  },
  {
    key:   'in_progress',
    label: 'In Progress',
    icon:  <TbBuildingSkyscraper size={22} />,
    bg:    'bg-indigo-50 dark:bg-indigo-900/20',
    icon_color: 'text-indigo-600 dark:text-indigo-400',
    border: 'border-l-indigo-500',
  },
  {
    key:   'completed',
    label: 'Completed',
    icon:  <MdOutlineCheckCircle size={22} />,
    bg:    'bg-green-50 dark:bg-green-900/20',
    icon_color: 'text-green-600 dark:text-green-400',
    border: 'border-l-green-500',
  },
  {
    key:   'high_priority',
    label: 'High Priority',
    icon:  <MdOutlineWarning size={22} />,
    bg:    'bg-red-50 dark:bg-red-900/20',
    icon_color: 'text-red-600 dark:text-red-400',
    border: 'border-l-red-500',
  },
  {
    key:   'overdue',
    label: 'Overdue',
    icon:  <FiAlertTriangle size={22} />,
    bg:    'bg-orange-50 dark:bg-orange-900/20',
    icon_color: 'text-orange-600 dark:text-orange-400',
    border: 'border-l-orange-500',
  },
];

export default function AssessmentAnalyticsCards() {
  const analytics        = useSelector((s) => s.assessment.analytics);
  const analyticsLoading = useSelector((s) => s.assessment.analyticsLoading);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
      {cards.map((card) => (
        <div
          key={card.key}
          className={`
            relative flex flex-col justify-between p-4 rounded-xl
            border border-stroke dark:border-strokedark border-l-4 ${card.border}
            bg-white dark:bg-boxdark shadow-sm
            hover:shadow-md transition-shadow duration-200
          `}
        >
          <div className={`w-9 h-9 rounded-lg ${card.bg} ${card.icon_color} flex items-center justify-center mb-2`}>
            {card.icon}
          </div>
          {analyticsLoading ? (
            <div className="h-8 flex items-center">
              <BeatLoader size={6} color="#2563eb" />
            </div>
          ) : (
            <span className="text-2xl font-bold text-gray-800 dark:text-white leading-none">
              {analytics?.[card.key] ?? 0}
            </span>
          )}
          <span className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-tight">{card.label}</span>
        </div>
      ))}
    </div>
  );
}
