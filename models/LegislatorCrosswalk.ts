// models/LegislatorCrosswalk.ts
//
// Maps a legislator's bioguide ID (used throughout Heard) to identifiers in
// external systems — most importantly the FEC candidate IDs (for campaign
// finance lookups via the OpenFEC API) and the OpenSecrets ID (for deep-links
// to industry breakdowns on opensecrets.org).
//
// Source: github.com/unitedstates/congress-legislators (CC0 public domain).
// Refresh by running: npx tsx scripts/ingest-crosswalk.ts
import mongoose, { Document, Model, Schema } from "mongoose";

export interface ILegislatorCrosswalk extends Document {
  bioguideId: string;
  fecIds: string[];
  opensecretsId?: string;
  govtrackId?: number;
  thomasId?: string;
  icpsrId?: number;
  wikipediaTitle?: string;
  updatedAt: Date;
}

const LegislatorCrosswalkSchema = new Schema<ILegislatorCrosswalk>({
  bioguideId: { type: String, required: true, unique: true, index: true },
  fecIds: { type: [String], default: [] },
  opensecretsId: { type: String },
  govtrackId: { type: Number },
  thomasId: { type: String },
  icpsrId: { type: Number },
  wikipediaTitle: { type: String },
  updatedAt: { type: Date, default: Date.now },
});

const LegislatorCrosswalk: Model<ILegislatorCrosswalk> =
  mongoose.models.LegislatorCrosswalk ||
  mongoose.model<ILegislatorCrosswalk>(
    "LegislatorCrosswalk",
    LegislatorCrosswalkSchema
  );

export default LegislatorCrosswalk;
