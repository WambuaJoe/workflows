"use client";

import { useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { Reorder, motion } from "motion/react";
import { CaretUpDownIcon, MagnifyingGlassIcon, PlusIcon } from "@phosphor-icons/react";
import {
  AnalyticsIcon,
  AutomationsIcon,
  ChatbotsIcon,
  EmailIcon,
  HelpIcon,
  IntegrationsIcon,
  OverviewIcon,
  SettingsIcon,
  SidebarToggleIcon,
  TemplatesIcon,
  OptimaMark,
  WorkflowIcon,
} from "@/components/icons";
import { cn } from "@/lib/cn";

type NavItem = { id: string; label: string; icon: ReactNode; badge?: string };
type Project = { id: string; label: string; color: string };

const MENU: NavItem[] = [
  { id: "overview", label: "Overview", icon: <OverviewIcon /> },
  { id: "email", label: "Email", icon: <EmailIcon /> },
  { id: "automations", label: "Automations", icon: <AutomationsIcon /> },
  { id: "analytics", label: "Analytics", icon: <AnalyticsIcon /> },
  { id: "integrations", label: "Integrations", icon: <IntegrationsIcon /> },
  { id: "workflow", label: "Workflow", icon: <WorkflowIcon />, badge: "New" },
  { id: "chatbots", label: "Chatbots", icon: <ChatbotsIcon />, badge: "New" },
  { id: "templates", label: "Templates", icon: <TemplatesIcon /> },
];

const PROJECTS: Project[] = [
  { id: "lead-sync", label: "Lead Sync Automation", color: "#437c9a" },
  { id: "marketing", label: "Marketing", color: "#f29536" },
  { id: "landing", label: "Landingpage Project", color: "#46d1ff" },
];

const OTHERS: NavItem[] = [
  { id: "settings", label: "Settings", icon: <SettingsIcon /> },
  { id: "help", label: "Get Help", icon: <HelpIcon /> },
];

const DRAG_SHADOW = {
  boxShadow: "0 2px 6px rgb(20 20 18 / 0.06), 0 14px 28px -12px rgb(20 20 18 / 0.28)",
};

function useMediaQuery(query: string) {
  return useSyncExternalStore(
    (onChange) => {
      const mq = window.matchMedia(query);
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

/**
 * Collapsing animates the width while everything inside keeps its position:
 * icons sit where the 68px rail centres them, and labels clip and fade.
 */
export function Sidebar() {
  const narrow = useMediaQuery("(max-width: 1180px)");
  const [override, setOverride] = useState<boolean | null>(null);
  const [active, setActive] = useState("automations");
  const [menu, setMenu] = useState(MENU);
  const [projects, setProjects] = useState(PROJECTS);
  // The first client render may correct the server's guess at the width; don't animate that.
  const [settled, setSettled] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setSettled(true));
    return () => cancelAnimationFrame(frame);
  }, []);
  const collapsed = override ?? narrow;
  const fade = cn(
    "transition-opacity duration-150 ease-out",
    collapsed && "pointer-events-none opacity-0",
  );

  return (
    <aside
      className={cn(
        "relative flex h-full shrink-0 flex-col overflow-hidden border-r border-line bg-white transition-[width] duration-[220ms] ease-out motion-reduce:transition-none",
        !settled && "no-transitions",
        collapsed ? "w-[68px]" : "w-[260px]",
      )}
    >
      <div className="flex h-16 w-[260px] shrink-0 items-center border-b border-line pr-3 pl-[18px]">
        <button
          type="button"
          onClick={() => collapsed && setOverride(false)}
          aria-label={collapsed ? "Expand sidebar" : "Optima"}
          title={collapsed ? "Expand sidebar" : undefined}
          className="flex min-w-0 items-center gap-2.5 rounded-[9px]"
        >
          <span className="grid size-8 shrink-0 place-items-center rounded-[9px] bg-logo text-white">
            <OptimaMark size={20} />
          </span>
          <span
            className={cn("text-[18.5px] font-semibold tracking-[-0.02em] whitespace-nowrap", fade)}
          >
            Optima
          </span>
        </button>
        <button
          type="button"
          onClick={() => setOverride(true)}
          tabIndex={collapsed ? -1 : 0}
          aria-label="Collapse sidebar"
          title="Collapse sidebar"
          className={cn(
            "ml-auto grid size-8 place-items-center rounded-[8px] text-muted transition-colors duration-150 hover:bg-hover hover:text-ink",
            fade,
          )}
        >
          <SidebarToggleIcon />
        </button>
      </div>

      <motion.nav
        layoutScroll
        aria-label="Main"
        className="scrollbar-subtle flex min-h-0 w-[260px] flex-1 flex-col overflow-x-hidden overflow-y-auto px-3 pt-4 pb-3"
      >
        <label
          className={cn(
            "flex h-9 shrink-0 items-center gap-2 overflow-hidden rounded-[10px] border border-line px-3 text-subtle transition-[width,border-color,box-shadow] duration-[220ms] ease-out focus-within:border-line-strong focus-within:shadow-[0_0_0_3px_var(--color-brand-soft)] motion-reduce:transition-none",
            collapsed ? "w-11" : "w-full",
          )}
          onClick={() => collapsed && setOverride(false)}
        >
          <MagnifyingGlassIcon size={17} className="shrink-0" />
          <input
            type="search"
            placeholder="Search"
            aria-label="Search"
            tabIndex={collapsed ? -1 : 0}
            className={cn(
              "min-w-0 flex-1 bg-transparent text-[13.5px] text-ink outline-none placeholder:text-subtle",
              fade,
            )}
          />
        </label>

        <SectionLabel collapsed={collapsed}>Menu</SectionLabel>
        <Reorder.Group
          as="ul"
          axis="y"
          values={menu}
          onReorder={setMenu}
          className="flex flex-col gap-1"
        >
          {menu.map((item) => (
            <Reorder.Item
              key={item.id}
              value={item}
              as="li"
              whileDrag={DRAG_SHADOW}
              className="relative rounded-[10px] bg-white"
            >
              <NavButton
                item={item}
                active={active === item.id}
                collapsed={collapsed}
                onClick={() => setActive(item.id)}
              />
            </Reorder.Item>
          ))}
        </Reorder.Group>

        <div className="relative mt-6 mb-2 flex h-6 items-center pr-1 pl-3">
          <span className={cn("text-[10.5px] tracking-[0.06em] text-subtle uppercase", fade)}>
            Projects
          </span>
          <button
            type="button"
            aria-label="New project"
            title="New project"
            tabIndex={collapsed ? -1 : 0}
            className={cn(
              "ml-auto grid size-6 place-items-center rounded-[6px] text-brand transition-colors duration-150 hover:bg-hover",
              fade,
            )}
          >
            <PlusIcon size={15} weight="bold" />
          </button>
          <Divider visible={collapsed} />
        </div>
        <Reorder.Group
          as="ul"
          axis="y"
          values={projects}
          onReorder={setProjects}
          className="flex flex-col gap-1"
        >
          {projects.map((project) => (
            <Reorder.Item
              key={project.id}
              value={project}
              as="li"
              whileDrag={DRAG_SHADOW}
              className="relative rounded-[10px] bg-white"
            >
              <button
                type="button"
                title={collapsed ? project.label : undefined}
                className={cn(
                  "flex h-9 items-center gap-3 overflow-hidden rounded-[10px] pl-4 text-[13.5px] whitespace-nowrap text-ink-soft transition-[width,background-color,color] duration-[220ms] ease-out hover:bg-hover hover:text-ink motion-reduce:transition-none",
                  collapsed ? "w-11" : "w-full",
                )}
              >
                <span
                  aria-hidden
                  className="size-2.5 shrink-0 rounded-[3px]"
                  style={{ backgroundColor: project.color }}
                />
                <span className={cn("truncate", fade)}>{project.label}</span>
              </button>
            </Reorder.Item>
          ))}
        </Reorder.Group>

        <div className="mt-auto pt-6">
          <SectionLabel collapsed={collapsed} className="mt-0">
            Others
          </SectionLabel>
          <ul className="flex flex-col gap-1">
            {OTHERS.map((item) => (
              <li key={item.id}>
                <NavButton
                  item={item}
                  active={active === item.id}
                  collapsed={collapsed}
                  onClick={() => setActive(item.id)}
                />
              </li>
            ))}
          </ul>
          <UserCard collapsed={collapsed} />
        </div>
      </motion.nav>
    </aside>
  );
}

function Divider({ visible }: { visible: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        "pointer-events-none absolute top-1/2 left-2.5 h-px w-6 bg-line transition-opacity duration-150 ease-out",
        visible ? "opacity-100" : "opacity-0",
      )}
    />
  );
}

function SectionLabel({
  children,
  collapsed,
  className,
}: {
  children: ReactNode;
  collapsed: boolean;
  className?: string;
}) {
  return (
    <div className={cn("relative mt-6 mb-2 flex h-4 items-center px-3", className)}>
      <span
        className={cn(
          "text-[10.5px] tracking-[0.06em] text-subtle uppercase transition-opacity duration-150 ease-out",
          collapsed && "opacity-0",
        )}
      >
        {children}
      </span>
      <Divider visible={collapsed} />
    </div>
  );
}

function NavButton({
  item,
  active,
  collapsed,
  onClick,
}: {
  item: NavItem;
  active: boolean;
  collapsed: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      aria-label={collapsed ? item.label : undefined}
      title={collapsed ? item.label : undefined}
      className={cn(
        "flex h-9 items-center gap-2 overflow-hidden rounded-[10px] pl-3 text-[13.5px] whitespace-nowrap transition-[width,background-color,color] duration-[220ms] ease-out motion-reduce:transition-none",
        collapsed ? "w-11" : "w-full",
        active
          ? "bg-active font-medium text-ink shadow-[0_1px_2px_rgb(20_20_18/0.06)]"
          : "text-ink-soft hover:bg-hover hover:text-ink",
      )}
    >
      <span
        className={cn(
          "grid size-5 shrink-0 place-items-center transition-colors duration-150",
          active ? "text-ink" : "text-icon",
        )}
      >
        {item.icon}
      </span>
      <span
        className={cn(
          "flex items-center gap-2 transition-opacity duration-150 ease-out",
          collapsed && "opacity-0",
        )}
      >
        <span className="truncate">{item.label}</span>
        {item.badge && (
          <span className="rounded-full border border-new-line bg-new-soft px-1.5 text-[11px] leading-[17px] font-normal text-new">
            {item.badge}
          </span>
        )}
      </span>
    </button>
  );
}

function UserCard({ collapsed }: { collapsed: boolean }) {
  const avatar = (
    <span
      aria-hidden
      className="grid size-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#f8dccd] to-[#e9a68c] text-[13px] font-semibold text-[#7b3c27]"
    >
      EP
    </span>
  );

  return (
    <div className="relative mt-4 h-[66px]">
      <button
        type="button"
        tabIndex={collapsed ? -1 : 0}
        className={cn(
          "flex h-full w-full items-center gap-3 rounded-[14px] border border-line px-3 text-left transition-[background-color,opacity] duration-150 ease-out hover:bg-hover",
          collapsed && "pointer-events-none opacity-0",
        )}
      >
        {avatar}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13.5px] leading-5 font-semibold">Eleanor Pena</span>
          <span className="block truncate text-[11.5px] leading-4 text-muted">Free account</span>
        </span>
        <CaretUpDownIcon size={17} weight="bold" className="shrink-0 text-ink" />
      </button>
      <button
        type="button"
        tabIndex={collapsed ? 0 : -1}
        title="Eleanor Pena · Free account"
        className={cn(
          "absolute top-[13px] left-0.5 rounded-full transition-opacity duration-150 ease-out",
          collapsed ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      >
        {avatar}
        <span className="sr-only">Account: Eleanor Pena, Free account</span>
      </button>
    </div>
  );
}
