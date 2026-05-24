export {
  getGatewaySecrets,
  getSharePointDirectorSecrets,
  getMailCourierSecrets,
  getPhoenixCommandSecrets,
  testKeyVaultConnection,
} from './keyvault.js';

export type {
  PhoenixEchoGatewaySecrets,
  SharePointDirectorSecrets,
  MailCourierSecrets,
  PhoenixCommandSecrets,
} from './keyvault.js';

export type {
  M365User,
  SharePointSite,
  SharePointList,
  MailMessage,
  CalendarEvent,
  DriveItem,
} from './types.js';
