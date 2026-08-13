import mongoose, { Document, Schema } from 'mongoose';

export interface IAuditLog extends Document {
  timestamp: Date;
  requestedBy: string;
  action: any;
  simulatedEffect: any;
  decision: "APPROVE" | "HOLD" | "REJECT";
  reason: string;
  executionId?: string;
  txHash?: string;
  status: "PENDING" | "EXECUTED" | "HELD" | "REJECTED" | "FAILED";
  idempotencyKey: string;
}

const AuditLogSchema: Schema = new Schema({
  timestamp: { type: Date, default: Date.now },
  requestedBy: { type: String, required: true },
  action: { type: Schema.Types.Mixed, required: true },
  simulatedEffect: { type: Schema.Types.Mixed },
  decision: { type: String, enum: ["APPROVE", "HOLD", "REJECT"], required: true },
  reason: { type: String, required: true },
  executionId: { type: String },
  txHash: { type: String },
  status: { 
    type: String, 
    enum: ["PENDING", "EXECUTED", "HELD", "REJECTED", "FAILED"], 
    required: true,
    default: "PENDING"
  },
  idempotencyKey: { type: String, required: true, unique: true }
});

export const AuditLog = mongoose.models.AuditLog || mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);
