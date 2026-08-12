import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { createSchedule, setShowScheduleModal, clearCreateSuccess } from '../../store/features/assessment/assessmentSlice';
import AssessmentL1Selector from './AssessmentL1Selector';
import { ASSESSMENT_PRIORITY } from './assessmentConstants';
import { MdClose } from 'react-icons/md';
import { FiCalendar, FiCheckCircle } from 'react-icons/fi';
import { toast } from 'react-toastify';

export default function ScheduleAssessmentModal() {
  const dispatch       = useDispatch();
  const building       = useSelector((s) => s.assessment.selectedBuilding);
  const createLoading  = useSelector((s) => s.assessment.createLoading);
  const createSuccess  = useSelector((s) => s.assessment.createSuccess);

  const [form, setForm] = useState({
    assessment_date: '',
    priority:        ASSESSMENT_PRIORITY.MEDIUM,
    remarks:         '',
  });
  const [selectedL1Id,   setSelectedL1Id]   = useState(null);
  const [selectedL1Name, setSelectedL1Name] = useState('');

  const handleClose = () => {
    dispatch(setShowScheduleModal(false));
    dispatch(clearCreateSuccess());
    setSelectedL1Id(null);
    setSelectedL1Name('');
    setForm({ assessment_date: '', priority: ASSESSMENT_PRIORITY.MEDIUM, remarks: '' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!building) return toast.error('No building selected');
    if (!form.assessment_date) return toast.error('Please select an assessment date');
    if (!selectedL1Id)        return toast.error('Please select an L1 assessor');

    const payload = {
      // Building data
      building_uid:     building.uid        || null,
      building_sac:     building.sac_number || null,
      building_name:    building.name       || '',
      building_ward:    building.ward       || '',
      building_address: building.address    || '',
      // GIS identifiers — required
      gis_layer_id:     building.gis_layer_id   || '',
      gis_global_id:    building.gis_global_id  || '',
      gis_object_id:    building.gis_object_id,
      // Schedule
      assessment_date:  form.assessment_date,
      priority:         form.priority,
      remarks:          form.remarks,
      // Assignment
      assigned_to:      selectedL1Id,
    };

    const result = await dispatch(createSchedule(payload));
    if (result.meta.requestStatus === 'fulfilled') {
      toast.success(`Assessment scheduled and assigned to ${selectedL1Name}!`);
      setTimeout(handleClose, 1500);
    } else {
      toast.error(result.payload || 'Failed to create schedule');
    }
  };

  if (!building) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/70 backdrop-blur-sm p-4">
      <div className="relative bg-white dark:bg-boxdark rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-stroke dark:border-strokedark flex-shrink-0">
          <div>
            <h2 className="text-lg font-bold text-gray-800 dark:text-white">Schedule Assessment</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 truncate max-w-sm">
              {building.name} · {building.ward} Ward
            </p>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
          >
            <MdClose size={22} />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-5">
          {createSuccess ? (
            <div className="flex flex-col items-center justify-center gap-3 py-12">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                <FiCheckCircle size={32} className="text-green-600 dark:text-green-400" />
              </div>
              <p className="text-lg font-semibold text-gray-800 dark:text-white">Assessment Scheduled!</p>
              <p className="text-sm text-gray-500 text-center">
                Assigned to <strong>{selectedL1Name}</strong>. A push notification has been sent.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">

              {/* Date + Priority */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                    Assessment Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    min={new Date().toISOString().split('T')[0]}
                    value={form.assessment_date}
                    onChange={(e) => setForm((f) => ({ ...f, assessment_date: e.target.value }))}
                    className="w-full text-sm rounded-lg border border-stroke dark:border-strokedark bg-white dark:bg-meta-4 text-gray-800 dark:text-gray-200 px-3 py-2.5 focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Priority</label>
                  <div className="flex gap-2">
                    {Object.values(ASSESSMENT_PRIORITY).map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, priority: p }))}
                        className={`flex-1 py-2 rounded-lg text-xs font-semibold border transition-all
                          ${form.priority === p
                            ? p === 'HIGH'   ? 'bg-red-500 border-red-500 text-white'
                            : p === 'MEDIUM' ? 'bg-amber-500 border-amber-500 text-white'
                            :                  'bg-green-500 border-green-500 text-white'
                            : 'border-stroke dark:border-strokedark text-gray-600 dark:text-gray-400 hover:border-gray-400'
                          }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Remarks */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Remarks</label>
                <textarea
                  rows={2}
                  placeholder="Add notes for the assessor…"
                  value={form.remarks}
                  onChange={(e) => setForm((f) => ({ ...f, remarks: e.target.value }))}
                  className="w-full text-sm rounded-lg border border-stroke dark:border-strokedark bg-white dark:bg-meta-4 text-gray-800 dark:text-gray-200 px-3 py-2.5 focus:outline-none focus:border-primary resize-none"
                />
              </div>

              {/* L1 Selector */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Assign To L1 Assessor <span className="text-red-500">*</span>
                  {selectedL1Name && (
                    <span className="ml-2 text-primary font-medium">— {selectedL1Name} selected</span>
                  )}
                </label>
                <AssessmentL1Selector
                  selectedL1Id={selectedL1Id}
                  onSelect={(id, name) => { setSelectedL1Id(id); setSelectedL1Name(name); }}
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-2 border-t border-stroke dark:border-strokedark">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-5 py-2.5 rounded-lg text-sm font-medium border border-stroke dark:border-strokedark text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-meta-4 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  className="px-6 py-2.5 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-opacity-90 transition-colors disabled:opacity-60 flex items-center gap-2"
                >
                  <FiCalendar size={14} />
                  {createLoading ? 'Scheduling…' : 'Confirm & Assign'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
