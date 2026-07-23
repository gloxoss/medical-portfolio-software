export const NotificationTemplates = {
  APPOINTMENT_REMINDER: 'appointment.reminder',
  APPOINTMENT_CANCELLED: 'appointment.cancelled',
  APPOINTMENT_RESCHEDULED: 'appointment.rescheduled',
  LAB_RESULT_READY: 'lab.result.ready',
  LAB_RESULT_CRITICAL: 'lab.result.critical',
  INVOICE_RECEIPT: 'invoice.receipt',
  INVOICE_RECEIPT_SMS_FALLBACK: 'invoice.receipt.sms-fallback',
} as const;

export type NotificationTemplateKey =
  (typeof NotificationTemplates)[keyof typeof NotificationTemplates];

export const NotificationTemplateBodies: Record<
  NotificationTemplateKey,
  {
    sms?: string;
    emailSubject?: string;
    emailBody?: string;
  }
> = {
  [NotificationTemplates.APPOINTMENT_REMINDER]: {
    sms: 'Reminder: {{patient_name}}, appointment with {{doctor_name}} on {{date}} at {{time}} ({{location}}).',
    emailSubject: 'Appointment Reminder',
    emailBody:
      'Hello {{patient_name}}, your appointment with {{doctor_name}} is scheduled on {{date}} at {{time}} in {{location}}.',
  },
  [NotificationTemplates.APPOINTMENT_CANCELLED]: {
    sms: 'Your appointment on {{date}} at {{time}} has been cancelled. Contact {{location}} to reschedule.',
    emailSubject: 'Appointment Cancelled',
    emailBody:
      'Your appointment on {{date}} at {{time}} has been cancelled. Please contact {{location}} for a new slot.',
  },
  [NotificationTemplates.APPOINTMENT_RESCHEDULED]: {
    sms: 'Your appointment was moved to {{date}} at {{time}} ({{location}}).',
    emailSubject: 'Appointment Rescheduled',
    emailBody:
      'Your appointment has been rescheduled to {{date}} at {{time}} in {{location}}.',
  },
  [NotificationTemplates.LAB_RESULT_READY]: {
    sms: 'Your {{panel}} results are ready. View them at {{portal_url}}.',
    emailSubject: 'Lab Results Ready',
    emailBody:
      'Your {{panel}} results are now ready. Open {{portal_url}} to review your report.',
  },
  [NotificationTemplates.LAB_RESULT_CRITICAL]: {
    sms: 'Critical lab alert: contact your clinic immediately.',
    emailSubject: 'Urgent Lab Result Alert',
    emailBody:
      'One or more lab results are critical. Please contact your clinic immediately.',
  },
  [NotificationTemplates.INVOICE_RECEIPT]: {
    emailSubject: 'Payment Receipt {{invoice_no}}',
    emailBody:
      'Payment received for invoice {{invoice_no}}. Amount: {{amount}} {{currency}} on {{date}}.',
  },
  [NotificationTemplates.INVOICE_RECEIPT_SMS_FALLBACK]: {
    sms: 'Receipt: {{amount}} {{currency}} paid on {{date}}. See details at {{portal_url}}.',
  },
};
