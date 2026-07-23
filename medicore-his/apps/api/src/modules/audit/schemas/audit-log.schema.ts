import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type AuditLogDocument = HydratedDocument<AuditLog>;

@Schema({
  collection: 'audit_logs',
  timestamps: { createdAt: 'created_at', updatedAt: false }, // Logs are immutable
})
export class AuditLog {
  @Prop({ required: true, index: true }) org_id!: string;
  @Prop({ index: true }) facility_id?: string;
  
  @Prop({ required: true, index: true }) user_id!: string;
  @Prop({ required: true }) user_name!: string;
  @Prop({ required: true }) user_role!: string;
  
  @Prop({ required: true, index: true }) action!: string; // e.g. "USER_INVITED", "FACILITY_CREATED", "INVOICE_PAID"
  
  @Prop({ required: true, index: true }) entity_type!: string; // e.g. "User", "Facility", "Patient"
  @Prop({ required: true, index: true }) entity_id!: string;
  
  @Prop({ type: Object, default: {} }) metadata!: Record<string, any>;
  
  @Prop({ required: true }) ip_address!: string;
  @Prop() user_agent?: string;
}

export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);

// Text index for easy searching
AuditLogSchema.index(
  { action: 'text', user_name: 'text', entity_type: 'text' },
  { name: 'audit_search_idx' }
);
