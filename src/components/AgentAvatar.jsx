import React from 'react';
import AgentAvatarIcon from './AgentAvatarIcon';

export const AgentAvatar = ({
  agent = null,
  config = null,
  size = "w-11 h-11",
  iconSize = "text-[22px]",
  className = "",
  onClick = undefined,
  title = undefined
}) => {
  // Check if config passed directly, or on agent object, or in localStorage fallback
  let avatarConfig = config || agent?.avatar_config;

  // Fallback to localStorage if not directly present on agent object
  if (!avatarConfig && agent?.agent_id) {
    try {
      const localMap = JSON.parse(localStorage.getItem('lyfflow_agent_avatars') || '{}');
      if (localMap[agent.agent_id]) {
        avatarConfig = localMap[agent.agent_id];
      }
    } catch (e) {
      // ignore JSON parse error
    }
  }

  const initial = (agent?.name || '?').charAt(0).toUpperCase();

  if (avatarConfig && avatarConfig.icon && avatarConfig.gradient) {
    return (
      <div
        onClick={onClick}
        title={title || agent?.name || "AI Agent"}
        className={`${size} ${avatarConfig.shape === 'rounded' ? 'rounded-2xl' : 'rounded-full'} flex items-center justify-center shrink-0 text-white shadow-md select-none overflow-hidden ${onClick ? 'cursor-pointer' : ''} ${className}`}
        style={{ background: avatarConfig.gradient }}
      >
        <AgentAvatarIcon id={avatarConfig.icon} className={iconSize} />
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      title={title || agent?.name || "AI Agent"}
      className={`${size} rounded-full bg-[#0f172a] flex items-center justify-center shrink-0 select-none overflow-hidden ${onClick ? 'cursor-pointer' : ''} ${className}`}
    >
      <span className="text-white font-bold text-lg leading-none">{initial}</span>
    </div>
  );
};

export default AgentAvatar;
