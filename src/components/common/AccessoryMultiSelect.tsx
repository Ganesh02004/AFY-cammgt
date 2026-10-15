import React, { useState } from 'react';
import { Check, Plus, X, Tag } from 'lucide-react';

export const DEFAULT_ACCESSORY_OPTIONS = [
  'Adapter',
  'Power cable',
  'USB cable',
  'Data cable',
  'Belt / strap',
  'Battery',
  'Charger',
  'Mount / holder',
  'Carrying case',
  'Other'
];

interface AccessoryMultiSelectProps {
  selectedAccessories: string[];
  onChange: (accessories: string[]) => void;
  availableOptions?: string[];
  label?: string;
  className?: string;
}

export const AccessoryMultiSelect: React.FC<AccessoryMultiSelectProps> = ({
  selectedAccessories = [],
  onChange,
  availableOptions = DEFAULT_ACCESSORY_OPTIONS,
  label = "Accessories Included",
  className = ""
}) => {
  const [otherText, setOtherText] = useState(() => {
    const otherItem = selectedAccessories.find(a => a.startsWith('Other: ') || a === 'Other');
    return otherItem ? otherItem.replace(/^Other:\s*/, '') : '';
  });
  const [showOtherInput, setShowOtherInput] = useState(() => selectedAccessories.some(a => a.startsWith('Other')));

  const toggleOption = (opt: string) => {
    if (opt === 'Other') {
      if (showOtherInput) {
        setShowOtherInput(false);
        setOtherText('');
        onChange(selectedAccessories.filter(a => !a.startsWith('Other')));
      } else {
        setShowOtherInput(true);
        if (!selectedAccessories.some(a => a.startsWith('Other'))) {
          onChange([...selectedAccessories.filter(a => !a.startsWith('Other')), 'Other']);
        }
      }
      return;
    }

    if (selectedAccessories.includes(opt)) {
      onChange(selectedAccessories.filter(a => a !== opt));
    } else {
      onChange([...selectedAccessories, opt]);
    }
  };

  const handleOtherTextChange = (text: string) => {
    setOtherText(text);
    const filtered = selectedAccessories.filter(a => !a.startsWith('Other'));
    if (text.trim()) {
      onChange([...filtered, `Other: ${text.trim()}`]);
    } else {
      onChange([...filtered, 'Other']);
    }
  };

  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider">
          {label}
        </label>
      )}

      {/* Selectable Badges/Pills */}
      <div className="flex flex-wrap gap-1.5 p-2 bg-white border border-slate-200 rounded-xl min-h-[38px] items-center">
        {availableOptions.map(opt => {
          const isSelected = opt === 'Other'
            ? showOtherInput || selectedAccessories.some(a => a.startsWith('Other'))
            : selectedAccessories.includes(opt);

          return (
            <button
              key={opt}
              type="button"
              onClick={() => toggleOption(opt)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition flex items-center space-x-1 cursor-pointer ${
                isSelected
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {isSelected ? <Check className="w-3 h-3 shrink-0" /> : <Plus className="w-3 h-3 shrink-0 text-slate-400" />}
              <span>{opt}</span>
            </button>
          );
        })}
      </div>

      {/* Additional 'Other' description text field */}
      {showOtherInput && (
        <div className="pt-1">
          <input
            type="text"
            value={otherText}
            onChange={(e) => handleOtherTextChange(e.target.value)}
            placeholder="Specify additional unlisted accessory details..."
            className="w-full px-3 py-1.5 text-xs border border-indigo-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none bg-indigo-50/30"
          />
        </div>
      )}
    </div>
  );
};
