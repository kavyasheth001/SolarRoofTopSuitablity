import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchL1Users } from '../../store/features/assessment/assessmentSlice';
import { FiUser, FiAlertTriangle, FiCheckCircle, FiClock, FiList } from 'react-icons/fi';
import { BeatLoader } from 'react-spinners';

function WorkloadBadge({ count, label, icon: Icon, color }) {
  return (
    <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${color}`}>
      <Icon size={9} />
      <span>{count}</span>
      <span className="hidden sm:inline">{label}</span>
    </div>
  );
}

export default function AssessmentL1Selector({ selectedL1Id, onSelect }) {
  const dispatch = useDispatch();
  const l1Users  = useSelector((s) => s.assessment.l1Users);
  const loading  = useSelector((s) => s.assessment.l1UsersLoading);

  useEffect(() => {
    dispatch(fetchL1Users());
  }, [dispatch]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <BeatLoader size={8} color="#2563eb" />
      </div>
    );
  }

  if (l1Users.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-gray-400">No L1 assessors available.</div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-1">
      {l1Users.map((user) => {
        const isSelected = selectedL1Id === user.id;
        const hasOverdue = user.overdue_assignments > 0;

        return (
          <button
            key={user.id}
            type="button"
            onClick={() => onSelect(user.id, user.name)}
            className={`
              relative flex flex-col gap-2 p-3 rounded-xl border text-left transition-all duration-150
              ${isSelected
                ? 'border-primary bg-primary/5 dark:bg-primary/10 shadow-sm'
                : 'border-stroke dark:border-strokedark bg-white dark:bg-meta-4 hover:border-primary/50'}
              ${hasOverdue && !isSelected ? 'border-l-2 border-l-orange-400' : ''}
            `}
          >
            {/* Selection indicator */}
            {isSelected && (
              <div className="absolute top-2 right-2 w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                <FiCheckCircle size={10} className="text-white" />
              </div>
            )}

            {/* User info */}
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold
                ${isSelected ? 'bg-primary text-white' : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'}`}>
                {user.name?.charAt(0)?.toUpperCase() || 'U'}
              </div>
              <div className="min-w-0">
                <p className={`text-sm font-semibold truncate ${isSelected ? 'text-primary' : 'text-gray-800 dark:text-gray-100'}`}>
                  {user.name}
                </p>
                {user.ward && (
                  <p className="text-[10px] text-gray-400">{user.ward} Ward</p>
                )}
              </div>
            </div>

            {/* Workload metrics */}
            <div className="flex flex-wrap gap-1">
              <WorkloadBadge
                count={user.pending_assignments || 0}
                label="Pending"
                icon={FiList}
                color="bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400"
              />
              <WorkloadBadge
                count={user.today_assigned || 0}
                label="Today"
                icon={FiClock}
                color="bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400"
              />
              <WorkloadBadge
                count={user.today_completed || 0}
                label="Done"
                icon={FiCheckCircle}
                color="bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400"
              />
              {user.overdue_assignments > 0 && (
                <WorkloadBadge
                  count={user.overdue_assignments}
                  label="Overdue"
                  icon={FiAlertTriangle}
                  color="bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400"
                />
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
