// Дані для політики конфіденційності (/privacy). Підставляються в тексти src/i18n/locales/privacy/*.json.
// TODO перед публікацією: справжні назва розпорядника, адреса й email (див. docs/privacy-policy.md).
export const LEGAL = {
  controller: '[MovaQuest team, address]',
  email: 'privacy@movaquest.example',
  updated: '2026-11-24',
  deletionDays: 30,
  analyticsMonths: 14,
  logsDays: 30,
  minAge: 16,
} as const
