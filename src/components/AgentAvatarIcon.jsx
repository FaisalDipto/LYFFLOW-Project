import {
  BadgeCheck,
  BarChart3,
  Bot,
  Brain,
  Coins,
  Cpu,
  Headphones,
  Headset,
  MessagesSquare,
  Network,
  Rocket,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Zap
} from 'lucide-react';

const ICON_COMPONENTS = {
  smart_toy: Bot,
  support_agent: Headset,
  psychology: Brain,
  auto_awesome: Sparkles,
  bolt: Zap,
  headset_mic: Headphones,
  security: ShieldCheck,
  memory: Cpu,
  rocket_launch: Rocket,
  hub: Network,
  verified_user: BadgeCheck,
  neurology: Brain,
  forum: MessagesSquare,
  trending_up: TrendingUp,
  monitoring: BarChart3,
  token: Coins
};

export const AgentAvatarIcon = ({ id, className = '', strokeWidth = 2 }) => {
  const Icon = ICON_COMPONENTS[id] || Bot;

  return (
    <Icon
      aria-hidden="true"
      className={className}
      strokeWidth={strokeWidth}
      style={{ width: '1em', height: '1em' }}
    />
  );
};

export default AgentAvatarIcon;

