import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { IncidentOut } from '../../types/domain';
import { useIncidentsStore } from '../../store/incidents';
import { useUiStore } from '../../store/ui';
import { GitMerge } from 'lucide-react';

interface MergeDialogProps {
  currentIncident: IncidentOut;
  isOpen: boolean;
  onClose: () => void;
}

export const MergeDialog: React.FC<MergeDialogProps> = ({
  currentIncident,
  isOpen,
  onClose,
}) => {
  const incidents = useIncidentsStore((state) => state.incidents);
  const mergeIncidents = useIncidentsStore((state) => state.mergeIncidents);
  const showToast = useUiStore((state) => state.showToast);

  const candidates = incidents.filter(
    (i) => i.id !== currentIncident.id && (i.status !== 'resolved' && i.status !== 'closed')
  );

  const [selectedCandidateId, setSelectedCandidateId] = useState<string>(
    candidates[0]?.id || ''
  );

  const handleMerge = () => {
    if (!selectedCandidateId) return;
    const target = candidates.find((c) => c.id === selectedCandidateId);
    mergeIncidents(currentIncident.id, selectedCandidateId);
    showToast({
      title: 'Incidents Consolidated',
      message: `${target?.code} merged into ${currentIncident.code}.`,
      type: 'success',
    });
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Consolidate Related Incidents">
      <div className="space-y-4">
        <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1">
          <div className="text-xs font-semibold text-slate-900">
            Target: {currentIncident.code} ({currentIncident.title})
          </div>
          <div className="text-xs text-slate-500">
            All reports and calls from the selected incident will be consolidated into this master record.
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-2">
            Select incident to merge into {currentIncident.code}:
          </label>
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {candidates.map((cand) => (
              <label
                key={cand.id}
                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                  selectedCandidateId === cand.id
                    ? 'bg-slate-50 border-slate-900 shadow-sm'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <input
                  type="radio"
                  name="candidate"
                  value={cand.id}
                  checked={selectedCandidateId === cand.id}
                  onChange={(e) => setSelectedCandidateId(e.target.value)}
                  className="mt-0.5 text-slate-900 focus:ring-slate-900"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-900">{cand.code} · {cand.priority}</span>
                    <span className="text-slate-400 font-mono text-[11px]">{cand.area}</span>
                  </div>
                  <div className="text-xs text-slate-500 truncate mt-0.5">
                    {cand.title}
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            icon={<GitMerge className="w-4 h-4" />}
            onClick={handleMerge}
            disabled={!selectedCandidateId}
          >
            Confirm Merge
          </Button>
        </div>
      </div>
    </Modal>
  );
};
