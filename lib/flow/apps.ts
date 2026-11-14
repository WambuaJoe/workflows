export type AppKey = "slack" | "asana" | "mailchimp" | "zapier" | "spotify";

export type AppInfo = {
  key: AppKey;
  name: string;
  description: string;
  /** Brand mark from Dashboard Icons (dashboardicons.com). */
  icon: string;
  /** Title of a step created from this app. */
  action: string;
  stepDescription: string;
};

const ICON_CDN = "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg";

export const APPS: AppInfo[] = [
  {
    key: "slack",
    name: "Slack",
    description: "Send messages or alerts when key events happen.",
    icon: `${ICON_CDN}/slack.svg`,
    action: "Send Slack message",
    stepDescription: "Posts a message to a Slack channel when the flow reaches this step.",
  },
  {
    key: "asana",
    name: "Asana",
    description: "Sync tasks and trigger actions based on project updates.",
    icon: `${ICON_CDN}/asana.svg`,
    action: "Create Asana task",
    stepDescription: "Creates a task in Asana so someone on your team follows up.",
  },
  {
    key: "mailchimp",
    name: "Mailchimp",
    description: "Automate emails and campaigns based on user behavior.",
    icon: `${ICON_CDN}/mailchimp.svg`,
    action: "Add to Mailchimp audience",
    stepDescription: "Adds the person to a Mailchimp audience for onboarding campaigns.",
  },
  {
    key: "zapier",
    name: "Zapier",
    description: "Connect with thousands of apps to automate workflows.",
    icon: `${ICON_CDN}/zapier.svg`,
    action: "Trigger a Zap",
    stepDescription: "Starts a Zap, so anything connected to Zapier can run from here.",
  },
  {
    key: "spotify",
    name: "Spotify",
    description: "Trigger actions based on listening activity or preferences.",
    icon: `${ICON_CDN}/spotify.svg`,
    action: "Share welcome playlist",
    stepDescription: "Shares a welcome playlist with the person on Spotify.",
  },
];

export const APP_BY_KEY = Object.fromEntries(APPS.map((app) => [app.key, app])) as Record<
  AppKey,
  AppInfo
>;
