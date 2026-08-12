import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setFilter, resetFilters } from '../../store/features/assessment/assessmentSlice';
import { FiFilter, FiChevronDown, FiChevronUp, FiX } from 'react-icons/fi';

const WARD_OPTIONS = ['A','B','C','D','E','F/N','F/S','G/N','G/S','H/E','H/W','K/E','K/W','L','M/E','M/W','N','P/N','P/S','R/C','R/N','R/S','S','T'];
const ZONE_OPTIONS = [
  { value: '1', label: 'City Island (Zone 1)' },
  { value: '2', label: 'Eastern Suburbs (Zone 2)' },
  { value: '3', label: 'Western Suburbs (Zone 3)' },
];

export default function AssessmentFilters() {
  const dispatch = useDispatch();
  const filters  = useSelector((s) => s.assessment.filters);
  const [open, setOpen] = useState(false);

  const activeCount = Object.entries(filters).filter(
    ([, v]) => v !== '' && v !== false && v != null
  ).length;

  const handleChange = (key, value) => {
    dispatch(setFilter({ [key]: value }));
  };

  const handleReset = () => {
    dispatch(resetFilters());
    setOpen(false);
  };

  return (
    <div className="relative">
      {/* Toggle Button */}
      <button
        onClick={() => setOpen((o) => !o)}
        className={`
          flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-colors
          ${open || activeCount > 0
            ? 'bg-primary text-white border-primary'
            : 'bg-white dark:bg-boxdark text-gray-700 dark:text-gray-200 border-stroke dark:border-strokedark hover:border-primary'}
        `}
      >
        <FiFilter size={15} />
        Filters
        {activeCount > 0 && (
          <span className="bg-white text-primary text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
            {activeCount}
          </span>
        )}
        {open ? <FiChevronUp size={14} /> : <FiChevronDown size={14} />}
      </button>

      {/* Filter Panel */}
      {open && (
        <div className="
          absolute top-full right-0 z-30 mt-2 w-[640px] max-w-[95vw]
          bg-white dark:bg-boxdark border border-stroke dark:border-strokedark
          rounded-xl shadow-lg p-5
        ">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Filter Buildings</h3>
            <div className="flex items-center gap-3">
              {activeCount > 0 && (
                <button onClick={handleReset} className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1">
                  <FiX size={12} /> Clear all
                </button>
              )}
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600">
                <FiX size={18} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {/* Ward */}
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Ward</label>
              <select
                value={filters.ward}
                onChange={(e) => handleChange('ward', e.target.value)}
                className="w-full text-sm rounded-lg border border-stroke dark:border-strokedark bg-white dark:bg-meta-4 text-gray-800 dark:text-gray-200 px-3 py-2 focus:outline-none focus:border-primary"
              >
                <option value="">All Wards</option>
                {WARD_OPTIONS.map((w) => <option key={w} value={w}>{w} Ward</option>)}
              </select>
            </div>

            {/* Zone */}
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Zone</label>
              <select
                value={filters.zone}
                onChange={(e) => handleChange('zone', e.target.value)}
                className="w-full text-sm rounded-lg border border-stroke dark:border-strokedark bg-white dark:bg-meta-4 text-gray-800 dark:text-gray-200 px-3 py-2 focus:outline-none focus:border-primary"
              >
                <option value="">All Zones</option>
                {ZONE_OPTIONS.map((z) => <option key={z.value} value={z.value}>{z.label}</option>)}
              </select>
            </div>

            {/* Locality */}
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Locality</label>
              <input
                type="text"
                list="locality-options"
                placeholder="e.g. Andheri"
                value={filters.locality}
                onChange={(e) => handleChange('locality', e.target.value)}
                className="w-full text-sm rounded-lg border border-stroke dark:border-strokedark bg-white dark:bg-meta-4 text-gray-800 dark:text-gray-200 px-3 py-2 focus:outline-none focus:border-primary"
              />
              <datalist id="locality-options">
                <option value="Fort" />
                <option value="Andheri" />
                <option value="Bandra" />
                <option value="Ghatkopar" />
                <option value="Malad" />
                <option value="Dadar" />
                <option value="Borivali" />
                <option value="Colaba" />
                <option value="Kurla" />
                <option value="Worli" />
              </datalist>
            </div>

            {/* Road Name */}
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Road Name</label>
              <input
                type="text"
                list="road-options"
                placeholder="e.g. Rustom Sidhwa Marg"
                value={filters.road_name}
                onChange={(e) => handleChange('road_name', e.target.value)}
                className="w-full text-sm rounded-lg border border-stroke dark:border-strokedark bg-white dark:bg-meta-4 text-gray-800 dark:text-gray-200 px-3 py-2 focus:outline-none focus:border-primary"
              />
              <datalist id="road-options">
                <option value="Linking Road" />
                <option value="S.V. Road" />
                <option value="L.B.S. Marg" />
                <option value="Marine Drive" />
                <option value="Rustom Sidhwa Marg" />
              </datalist>
            </div>

            {/* Building Class */}
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Building Class</label>
              <select
                value={filters.bld_class}
                onChange={(e) => handleChange('bld_class', e.target.value)}
                className="w-full text-sm rounded-lg border border-stroke dark:border-strokedark bg-white dark:bg-meta-4 text-gray-800 dark:text-gray-200 px-3 py-2 focus:outline-none focus:border-primary"
              >
                <option value="">All Classes</option>
                <option value="Residential">Residential</option>
                <option value="Commercial">Commercial</option>
                <option value="Industrial">Industrial</option>
                <option value="Mixed">Mixed Use</option>
                <option value="Educational">Educational</option>
                <option value="Health Services">Health Services</option>
                <option value="Public & Semi-Public">Public & Semi-Public</option>
                <option value="Recreational">Recreational</option>
                <option value="Religious">Religious</option>
                <option value="Transportation">Transportation</option>
              </select>
            </div>

            {/* Sub Class */}
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Sub Class</label>
              <input
                type="text"
                list="subclass-options"
                placeholder="e.g. Private Office"
                value={filters.sub_class}
                onChange={(e) => handleChange('sub_class', e.target.value)}
                className="w-full text-sm rounded-lg border border-stroke dark:border-strokedark bg-white dark:bg-meta-4 text-gray-800 dark:text-gray-200 px-3 py-2 focus:outline-none focus:border-primary"
              />
              <datalist id="subclass-options">
                <option value="Residential Area" />
                <option value="Private Office" />
                <option value="Office" />
                <option value="Shop" />
                <option value="Restaurant" />
                <option value="Hotel" />
                <option value="Hospital" />
                <option value="School" />
                <option value="College" />
                <option value="Bank" />
                <option value="Public Toilet" />
                <option value="Temple" />
                <option value="Mosque" />
                <option value="Church" />
                <option value="Parking" />
              </datalist>
            </div>

            {/* Construction Type */}
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Construction Type</label>
              <select
                value={filters.cons_type}
                onChange={(e) => handleChange('cons_type', e.target.value)}
                className="w-full text-sm rounded-lg border border-stroke dark:border-strokedark bg-white dark:bg-meta-4 text-gray-800 dark:text-gray-200 px-3 py-2 focus:outline-none focus:border-primary"
              >
                <option value="">All Types</option>
                <option value="RCC">RCC</option>
                <option value="RCC_GF">RCC_GF</option>
                <option value="Load-bearing/Semi Pucca">Load-bearing/Semi Pucca</option>
                <option value="Kutcha">Kutcha</option>
              </select>
            </div>

            {/* Building Name */}
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Building Name</label>
              <input
                type="text"
                placeholder="e.g. Sunshine Apt"
                value={filters.building_name}
                onChange={(e) => handleChange('building_name', e.target.value)}
                className="w-full text-sm rounded-lg border border-stroke dark:border-strokedark bg-white dark:bg-meta-4 text-gray-800 dark:text-gray-200 px-3 py-2 focus:outline-none focus:border-primary"
              />
            </div>

            {/* UID */}
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">UID</label>
              <input
                type="text"
                placeholder="Building UID"
                value={filters.uid}
                onChange={(e) => handleChange('uid', e.target.value)}
                className="w-full text-sm rounded-lg border border-stroke dark:border-strokedark bg-white dark:bg-meta-4 text-gray-800 dark:text-gray-200 px-3 py-2 focus:outline-none focus:border-primary"
              />
            </div>

            {/* SAC */}
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">SAC Number</label>
              <input
                type="text"
                placeholder="SAC / SACNO"
                value={filters.sac}
                onChange={(e) => handleChange('sac', e.target.value)}
                className="w-full text-sm rounded-lg border border-stroke dark:border-strokedark bg-white dark:bg-meta-4 text-gray-800 dark:text-gray-200 px-3 py-2 focus:outline-none focus:border-primary"
              />
            </div>

            {/* Floors Min/Max */}
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Floors</label>
              <div className="flex gap-2">
                <input
                  type="number" min="0" placeholder="Min"
                  value={filters.floors_min}
                  onChange={(e) => handleChange('floors_min', e.target.value)}
                  className="w-1/2 text-sm rounded-lg border border-stroke dark:border-strokedark bg-white dark:bg-meta-4 text-gray-800 dark:text-gray-200 px-3 py-2 focus:outline-none focus:border-primary"
                />
                <input
                  type="number" min="0" placeholder="Max"
                  value={filters.floors_max}
                  onChange={(e) => handleChange('floors_max', e.target.value)}
                  className="w-1/2 text-sm rounded-lg border border-stroke dark:border-strokedark bg-white dark:bg-meta-4 text-gray-800 dark:text-gray-200 px-3 py-2 focus:outline-none focus:border-primary"
                />
              </div>
            </div>

            {/* Outstanding Range — note: these trigger Outstanding API */}
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                Outstanding Min (₹)
                <span className="ml-1 text-amber-500 text-[10px]">*API</span>
              </label>
              <input
                type="number" min="0" placeholder="e.g. 1000000"
                value={filters.outstanding_min}
                onChange={(e) => handleChange('outstanding_min', e.target.value)}
                className="w-full text-sm rounded-lg border border-stroke dark:border-strokedark bg-white dark:bg-meta-4 text-gray-800 dark:text-gray-200 px-3 py-2 focus:outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                Outstanding Max (₹)
                <span className="ml-1 text-amber-500 text-[10px]">*API</span>
              </label>
              <input
                type="number" min="0" placeholder="e.g. 5000000"
                value={filters.outstanding_max}
                onChange={(e) => handleChange('outstanding_max', e.target.value)}
                className="w-full text-sm rounded-lg border border-stroke dark:border-strokedark bg-white dark:bg-meta-4 text-gray-800 dark:text-gray-200 px-3 py-2 focus:outline-none focus:border-primary"
              />
            </div>

            {/* Assessment Year */}
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                Assessment Year
                <span className="ml-1 text-amber-500 text-[10px]">*API</span>
              </label>
              <input
                type="number" min="1990" max={new Date().getFullYear()} placeholder="e.g. 2020"
                value={filters.assessment_year}
                onChange={(e) => handleChange('assessment_year', e.target.value)}
                className="w-full text-sm rounded-lg border border-stroke dark:border-strokedark bg-white dark:bg-meta-4 text-gray-800 dark:text-gray-200 px-3 py-2 focus:outline-none focus:border-primary"
              />
            </div>

            {/* Taxpayer Category */}
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                Taxpayer Category
                <span className="ml-1 text-amber-500 text-[10px]">*API</span>
              </label>
              <select
                value={filters.taxpayer_category}
                onChange={(e) => handleChange('taxpayer_category', e.target.value)}
                className="w-full text-sm rounded-lg border border-stroke dark:border-strokedark bg-white dark:bg-meta-4 text-gray-800 dark:text-gray-200 px-3 py-2 focus:outline-none focus:border-primary"
              >
                <option value="">All Categories</option>
                <option value="Private">Private</option>
                <option value="Government">Government</option>
                <option value="MCGM">MCGM</option>
                <option value="MHADA">MHADA</option>
                <option value="SRA">SRA</option>
                <option value="Charitable Trust / institution">Charitable Trust</option>
                <option value="MMRCL">MMRCL</option>
                <option value="IT/ITES">IT/ITES</option>
                <option value="MBPT">MBPT</option>
              </select>
            </div>

            {/* Checkboxes */}
            <div className="flex flex-col gap-2 justify-end">
              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.repair_cess}
                  onChange={(e) => handleChange('repair_cess', e.target.checked)}
                  className="w-4 h-4 accent-primary"
                />
                Has Repair Cess
              </label>
            </div>
          </div>

          <p className="mt-3 text-[10px] text-amber-500 dark:text-amber-400">
            * Filters marked <strong>*API</strong> will query the Outstanding Assessment API.
          </p>
        </div>
      )}
    </div>
  );
}
