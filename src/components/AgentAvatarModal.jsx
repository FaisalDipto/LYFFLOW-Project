import React, { useState, useEffect } from 'react';
import { Check, X } from 'lucide-react';
import AgentAvatar from './AgentAvatar';
import AgentAvatarIcon from './AgentAvatarIcon';
import { AGENT_AVATAR_ICON_OPTIONS } from './agentAvatarIconOptions';

const GRADIENTS = [
  { id: 'cosmic', label: 'Cosmic Indigo', value: 'linear-gradient(135deg, #6366F1, #A855F7)' },
  { id: 'emerald', label: 'Emerald Mint', value: 'linear-gradient(135deg, #10B981, #14B8A6)' },
  { id: 'sunset', label: 'Sunset Orange', value: 'linear-gradient(135deg, #F97316, #F43F5E)' },
  { id: 'cyber', label: 'Cyber Blue', value: 'linear-gradient(135deg, #0EA5E9, #2563EB)' },
  { id: 'crimson', label: 'Crimson Rose', value: 'linear-gradient(135deg, #EF4444, #EC4899)' },
  { id: 'amber', label: 'Amber Gold', value: 'linear-gradient(135deg, #F59E0B, #EA580C)' },
  { id: 'midnight', label: 'Midnight Obsidian', value: 'linear-gradient(135deg, #1E293B, #0F172A)' },
  { id: 'neon', label: 'Neon Purple', value: 'linear-gradient(135deg, #C084FC, #9333EA)' },
  { id: 'teal', label: 'Teal Ocean', value: 'linear-gradient(135deg, #06B6D4, #0D9488)' },
  { id: 'fuchsia', label: 'Fuchsia Dream', value: 'linear-gradient(135deg, #D946EF, #8B5CF6)' },
  { id: 'hyper_pink', label: 'Hyper Pink', value: 'linear-gradient(135deg, #FF007F, #AA00FF)' },
  { id: 'electric_cyan', label: 'Electric Cyan', value: 'linear-gradient(135deg, #00F2FE, #4FACFE)' },
  { id: 'royal_gold', label: 'Royal Gold', value: 'linear-gradient(135deg, #F6D365, #FDA085)' },
  { id: 'forest_jade', label: 'Forest Jade', value: 'linear-gradient(135deg, #0BA360, #3CBBA1)' },
  { id: 'velvet_night', label: 'Velvet Night', value: 'linear-gradient(135deg, #4A00E0, #8E2DE2)' },
  { id: 'lava_red', label: 'Lava Red', value: 'linear-gradient(135deg, #FF416C, #FF4B2B)' },
  { id: 'slate_chrome', label: 'Slate Chrome', value: 'linear-gradient(135deg, #475569, #1E293B)' },
  { id: 'aurora_green', label: 'Aurora Green', value: 'linear-gradient(135deg, #00C9FF, #92FE9D)' },
  { id: 'coral_glow', label: 'Coral Glow', value: 'linear-gradient(135deg, #FF6A88, #FF99AC)' },
  { id: 'deep_violet', label: 'Deep Violet', value: 'linear-gradient(135deg, #310E68, #5F0A87)' }
];

export const AgentAvatarModal = ({ agent, isOpen, onClose, onSave }) => {
  const [selectedIcon, setSelectedIcon] = useState('smart_toy');
  const [selectedGradient, setSelectedGradient] = useState(GRADIENTS[0].value);
  const [selectedShape, setSelectedShape] = useState('circle');

  useEffect(() => {
    if (agent) {
      let existing = agent.avatar_config;
      if (!existing && agent.agent_id) {
        try {
          const localMap = JSON.parse(localStorage.getItem('lyfflow_agent_avatars') || '{}');
          existing = localMap[agent.agent_id];
        } catch (e) {}
      }
      if (existing) {
        setSelectedIcon(existing.icon || 'smart_toy');
        setSelectedGradient(existing.gradient || GRADIENTS[0].value);
        setSelectedShape(existing.shape || 'circle');
      } else {
        setSelectedIcon('smart_toy');
        setSelectedGradient(GRADIENTS[0].value);
        setSelectedShape('circle');
      }
    }
  }, [agent, isOpen]);

  if (!isOpen || !agent) return null;

  const previewConfig = {
    icon: selectedIcon,
    gradient: selectedGradient,
    shape: selectedShape
  };

  const handleSave = () => {
    const updatedConfig = {
      icon: selectedIcon,
      gradient: selectedGradient,
      shape: selectedShape
    };

    // Save to local persistence immediately so UI works seamlessly while backend is updated
    if (agent.agent_id) {
      try {
        const localMap = JSON.parse(localStorage.getItem('lyfflow_agent_avatars') || '{}');
        localMap[agent.agent_id] = updatedConfig;
        localStorage.setItem('lyfflow_agent_avatars', JSON.stringify(localMap));
      } catch (e) {}
    }

    onSave(updatedConfig, agent.agent_id);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h3 className="text-lg font-extrabold text-slate-900 font-['Epilogue']">Customize Agent Avatar</h3>
            <p className="text-xs text-slate-500 font-medium">Design a vector identity for {agent.name}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close avatar settings"
            className="p-1.5 rounded-xl hover:bg-slate-200/60 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X aria-hidden="true" className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-6 overflow-y-auto overflow-x-hidden space-y-6 flex-1">
          
          {/* Live Preview Banner */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100/80 border border-slate-200/60 flex items-center gap-4">
            <AgentAvatar
              agent={agent}
              config={previewConfig}
              size="w-16 h-16"
              iconSize="text-[34px]"
              className="shadow-lg transition-all duration-300"
            />
            <div className="min-w-0 flex-1">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-md inline-block mb-1">
                Live Preview
              </span>
              <h4 className="text-base font-bold text-slate-900 truncate">{agent.name}</h4>
              <p className="text-xs text-slate-500 truncate">{agent.role || 'Autonomous AI Agent'}</p>
            </div>
          </div>

          {/* Shape Selection */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-2.5">
              Avatar Shape
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setSelectedShape('circle')}
                className={`flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-xl font-bold text-xs border transition-all ${selectedShape === 'circle' ? 'border-indigo-600 bg-indigo-50/60 text-indigo-700 shadow-sm' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
              >
                <div className="w-5 h-5 rounded-full bg-indigo-600"></div>
                <span>Circle</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedShape('rounded')}
                className={`flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-xl font-bold text-xs border transition-all ${selectedShape === 'rounded' ? 'border-indigo-600 bg-indigo-50/60 text-indigo-700 shadow-sm' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
              >
                <div className="w-5 h-5 rounded-md bg-indigo-600"></div>
                <span>Rounded Square</span>
              </button>
            </div>
          </div>

          {/* Color Gradient Picker */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-2.5">
              Color Palette
            </label>
            <div className="grid grid-cols-5 gap-2.5 max-h-[160px] overflow-y-auto pr-1">
              {GRADIENTS.map((g) => {
                const isSelected = selectedGradient === g.value;
                return (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => setSelectedGradient(g.value)}
                    title={g.label}
                    className={`h-11 rounded-xl transition-all relative flex items-center justify-center shrink-0 ${isSelected ? 'ring-2 ring-offset-2 ring-indigo-600 scale-105 shadow-md' : 'hover:scale-105 opacity-90 hover:opacity-100'}`}
                    style={{ background: g.value }}
                  >
                    {isSelected && (
                      <Check aria-hidden="true" className="h-[18px] w-[18px] text-white drop-shadow" strokeWidth={2.5} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Icon Picker */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-2.5">
              Agent Vector Icon
            </label>
            <div className="grid grid-cols-4 gap-2.5 max-h-[180px] overflow-y-auto overflow-x-hidden pr-1">
              {AGENT_AVATAR_ICON_OPTIONS.map((item) => {
                const isSelected = selectedIcon === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedIcon(item.id)}
                    aria-label={`Use ${item.label} icon`}
                    aria-pressed={isSelected}
                    className={`min-w-0 overflow-hidden flex flex-col items-center justify-center p-2.5 rounded-xl border transition-all ${isSelected ? 'border-indigo-600 bg-indigo-50/80 text-indigo-700 shadow-sm' : 'border-slate-200/80 text-slate-600 hover:bg-slate-50 hover:border-slate-300'}`}
                  >
                    <AgentAvatarIcon id={item.id} className="mb-1 text-[24px] shrink-0" />
                    <span className="text-[10px] font-semibold truncate w-full text-center">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl font-bold text-xs text-slate-600 hover:bg-slate-200/60 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-6 py-2.5 rounded-xl font-bold text-xs text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-600/20 transition-all flex items-center gap-1.5"
          >
            <Check aria-hidden="true" className="h-4 w-4" strokeWidth={2.5} />
            <span>Save Avatar</span>
          </button>
        </div>

      </div>
    </div>
  );
};

export default AgentAvatarModal;
