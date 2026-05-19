export type FieldTestChecklistKey =
  | 'apiHealthChecked'
  | 'bootstrapDownloaded'
  | 'productCacheChecked'
  | 'customerCacheChecked'
  | 'wifiDisabled'
  | 'offlineSaleCreated'
  | 'receiptPendingChecked'
  | 'wifiEnabled'
  | 'receiptSynced'
  | 'duplicateSyncChecked';

export type FieldTestChecklistState = Record<FieldTestChecklistKey, boolean>;

export type FieldTestLogTone = 'info' | 'success' | 'warning' | 'error';

export type FieldTestLogEntry = {
  id: string;
  title: string;
  detail?: string;
  tone: FieldTestLogTone;
  createdAt: string;
};
