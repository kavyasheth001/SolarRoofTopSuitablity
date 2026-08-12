import { useSelector } from 'react-redux';
import { PRIORITY_COLORS, STATUS_COLORS } from './assessmentConstants';
import { FiMapPin, FiLayers, FiCalendar, FiClock } from 'react-icons/fi';
import { TbBuildingSkyscraper } from 'react-icons/tb';
import { BeatLoader } from 'react-spinners';

function InfoRow({ label, value, className = '' }) {
  if (value === undefined || value === null || value === '') return null;
  return (
    <div className="flex justify-between items-start gap-2 py-1.5 border-b border-gray-100 dark:border-gray-700 last:border-0">
      <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0 w-32">{label}</span>
      <span className={`text-xs font-medium text-gray-800 dark:text-gray-200 text-right ${className}`}>{value}</span>
    </div>
  );
}

function SectionTitle({ children }) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-2 mt-4 first:mt-0">
      {children}
    </p>
  );
}

export default function AssessmentDetails({ onScheduleClick }) {
  const building         = useSelector((s) => s.assessment.selectedBuilding);
  const outstanding      = useSelector((s) => s.assessment.outstandingData);
  const outstandingLoading = useSelector((s) => s.assessment.outstandingLoading);

  if (!building) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-center p-6">
        <div className="w-14 h-14 bg-gray-100 dark:bg-meta-4 rounded-full flex items-center justify-center">
          <TbBuildingSkyscraper size={26} className="text-gray-400" />
        </div>
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Select a building</p>
        <p className="text-xs text-gray-400">Click any building on the map or list to view details</p>
      </div>
    );
  }

  const priorityBadge = PRIORITY_COLORS[building.priority] || PRIORITY_COLORS.LOW;
  const statusBadge   = building.scheduleStatus ? STATUS_COLORS[building.scheduleStatus] : null;

  const fmt = (n) => n != null ? `₹${Number(n).toLocaleString('en-IN')}` : '—';

  return (
    <div className="flex flex-col h-auto w-full pb-4">
      {/* Header */}
      <div className="bg-gradient-to-br from-primary to-blue-700 rounded-xl p-4 mb-4 text-white flex-shrink-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-base font-bold leading-tight truncate">{building.name || 'Unnamed Building'}</p>
            {building.ward && (
              <p className="flex items-center gap-1 text-xs text-blue-100 mt-1">
                <FiMapPin size={10} /> {building.ward} Ward
                {building.locality && ` · ${building.locality}`}
              </p>
            )}
          </div>
          {building.priority && (
            <span className={`flex-shrink-0 px-2 py-0.5 rounded-full text-xs font-semibold bg-white/20 text-white`}>
              {building.priority}
            </span>
          )}
        </div>
        {building.address && (
          <p className="text-xs text-blue-100 mt-2 leading-relaxed">{building.address}</p>
        )}
      </div>

      {/* General Info */}
      <SectionTitle>General Information</SectionTitle>
      <div className="bg-gray-50 dark:bg-meta-4 rounded-lg p-3 mb-2">
        <InfoRow label="UID"          value={building.uid || '—'} />
        <InfoRow label="SAC Number"   value={building.sac_number || <span className="text-orange-500">Not Available</span>} />
        <InfoRow label="CTS No."      value={building.cts_no} />
        <InfoRow label="Sub-Class"    value={building.sub_class} />
        <InfoRow label="Floors"       value={building.no_floors != null ? `${building.no_floors} floors` : '—'} />
        <InfoRow label="Flat Count"   value={building.flat_count} />
        <InfoRow label="Zone"         value={building.zone_id === 1 ? 'City Island' : building.zone_id === 2 ? 'Eastern Suburbs' : building.zone_id === 3 ? 'Western Suburbs' : '—'} />
        <InfoRow label="Section"      value={building.section} />
      </div>

      {/* Outstanding Info */}
      <SectionTitle>Outstanding Assessment</SectionTitle>
      <div className="bg-gray-50 dark:bg-meta-4 rounded-lg p-3 mb-2 min-h-[80px]">
        {outstandingLoading ? (
          <div className="flex items-center gap-2 py-2">
            <BeatLoader size={6} color="#2563eb" />
            <span className="text-xs text-gray-400">Fetching outstanding data…</span>
          </div>
        ) : outstanding ? (
          <>
            <InfoRow label="Outstanding"       value={fmt(outstanding.outstanding_amount)} className="text-red-600 dark:text-red-400 font-bold" />
            <InfoRow label="Tax Amount"        value={fmt(outstanding.tax_amount)} />
            <InfoRow label="Repair Cess"       value={fmt(outstanding.repair_cess)} />
            <InfoRow label="Assessment Year"   value={outstanding.assessment_year || '—'} />
            <InfoRow label="Taxpayer Category" value={outstanding.taxpayer_category} />
            <InfoRow label="Unit Count"        value={outstanding.unit_count} />
            <InfoRow label="Proposal No."      value={outstanding.proposal_no} />
          </>
        ) : building.sac_number ? (
          <p className="text-xs text-gray-400 py-2">No outstanding record found for this building.</p>
        ) : (
          <p className="text-xs text-orange-500 py-2">SAC number missing — cannot fetch outstanding data.</p>
        )}
      </div>

      {/* GIS Info */}
      <SectionTitle>GIS Reference</SectionTitle>
      <div className="bg-gray-50 dark:bg-meta-4 rounded-lg p-3 mb-4">
        <InfoRow label="Object ID"  value={building.gis_object_id} />
        <InfoRow label="Global ID"  value={building.gis_global_id} />
        {building.latitude && building.longitude && (
          <InfoRow label="Coordinates" value={`${building.latitude?.toFixed(6)}, ${building.longitude?.toFixed(6)}`} />
        )}
      </div>

      {/* Schedule Button */}
      <div className="flex-shrink-0">
        <button
          onClick={onScheduleClick}
          className="w-full py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-opacity-90 transition-colors flex items-center justify-center gap-2"
        >
          <FiCalendar size={15} />
          Schedule Assessment
        </button>
      </div>
    </div>
  );
}
