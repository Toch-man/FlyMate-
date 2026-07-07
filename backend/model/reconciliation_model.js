const mongoose = require("mongoose");

const reconciliation_log_schema = new mongoose.Schema(
  {
    run_at: { type: Date, required: true, default: Date.now },
    status: {
      type: String,
      enum: ["clean", "issues_found", "error"],
      required: true,
    },
    discrepancy_count: { type: Number, default: 0 },
    mismatches: { type: mongoose.Schema.Types.Mixed },
    error_message: { type: String },
  },
  { timestamps: { createdAt: "created_at", updatedAt: false } },
);

module.exports = mongoose.model(
  "reconciliation_log",
  reconciliation_log_schema,
);
