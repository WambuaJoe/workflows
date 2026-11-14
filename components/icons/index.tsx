import {
  ArrowUUpLeftIcon,
  ArrowUUpRightIcon,
  BuildingIcon,
  ChartBarIcon,
  ChatsIcon,
  EnvelopeSimpleIcon,
  FunnelIcon,
  GearSixIcon,
  GitBranchIcon,
  GitForkIcon,
  HandIcon as PhosphorHand,
  HeadphonesIcon,
  HouseIcon,
  NavigationArrowIcon,
  PaletteIcon,
  PencilSimpleIcon,
  PlayIcon as PhosphorPlay,
  PuzzlePieceIcon,
  ShareNetworkIcon,
  SidebarSimpleIcon,
  SparkleIcon as PhosphorSparkle,
  StackIcon,
  UserPlusIcon,
  type Icon,
  type IconWeight,
} from "@phosphor-icons/react";

// The app's icon set: Phosphor Icons (MIT) at the design's sizes, plus a few glyphs drawn here.

export {
  AutomationsIcon,
  ConditionIcon,
  DoThisIcon,
  OptimaMark,
  PathsIcon,
  ZoomScanIcon,
} from "./glyphs";

type AppIconProps = { size?: number; className?: string };

function fromPhosphor(Glyph: Icon, defaultSize: number, weight: IconWeight = "fill") {
  return function AppIcon({ size = defaultSize, className }: AppIconProps) {
    return <Glyph size={size} weight={weight} className={className} aria-hidden />;
  };
}

// Sidebar
export const OverviewIcon = fromPhosphor(HouseIcon, 17);
export const EmailIcon = fromPhosphor(EnvelopeSimpleIcon, 17);
export const AnalyticsIcon = fromPhosphor(ChartBarIcon, 17);
export const IntegrationsIcon = fromPhosphor(StackIcon, 17);
export const WorkflowIcon = fromPhosphor(GitBranchIcon, 17);
export const ChatbotsIcon = fromPhosphor(ChatsIcon, 17);
export const TemplatesIcon = fromPhosphor(PuzzlePieceIcon, 17);
export const SettingsIcon = fromPhosphor(GearSixIcon, 19);
export const HelpIcon = fromPhosphor(HeadphonesIcon, 19);
export const SidebarToggleIcon = fromPhosphor(SidebarSimpleIcon, 21, "regular");

// Top bar
export const InviteIcon = fromPhosphor(UserPlusIcon, 17);
export const ShareIcon = fromPhosphor(ShareNetworkIcon, 16);

// Canvas and toolbar
export const PencilIcon = fromPhosphor(PencilSimpleIcon, 15);
export const PointerIcon = fromPhosphor(NavigationArrowIcon, 17);
export const HandIcon = fromPhosphor(PhosphorHand, 17);
export const SparkleIcon = fromPhosphor(PhosphorSparkle, 16);
export const UndoIcon = fromPhosphor(ArrowUUpLeftIcon, 16, "bold");
export const RedoIcon = fromPhosphor(ArrowUUpRightIcon, 16, "bold");

// Step cards
export const PlayIcon = fromPhosphor(PhosphorPlay, 10);
export const FounderIcon = fromPhosphor(BuildingIcon, 11);
export const DesignerIcon = fromPhosphor(PaletteIcon, 12);
export const FilterIcon = fromPhosphor(FunnelIcon, 15);
export const ForkIcon = fromPhosphor(GitForkIcon, 12);
