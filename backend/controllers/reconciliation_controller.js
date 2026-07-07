const cron = require("node-cron");
const Transaction = require("../model/transaction_model");
const ReconciliationLog = require("../model/reconciliation_log");
const { fetch_transactions } = require("../services/nomba.service");

async function run_nightly_reconciliation() {
  try {
    const end_date = new Date();
    const start_date = new Date(end_date.getTime() - 2 * 24 * 60 * 60 * 1000);

    const format_date = (date) => date.toISOString().slice(0, 10);

    const { transactions } = await fetch_transactions({
      date_from: format_date(start_date),
      date_to: format_date(end_date),
      status: "success",
    });

    const drift_report = [];

    for (const remote_tx of transactions) {
      const local = await Transaction.findOne({
        merchant_tx_ref: remote_tx.merchantTxRef,
      });

      if (!local) {
        drift_report.push({ type: "orphan_on_nomba", remote_tx });
        continue;
      }

      const remote_amount_naira = remote_tx.amount / 100;
      if (Math.abs(local.amount - remote_amount_naira) > 0.01) {
        drift_report.push({
          type: "amount_drift",
          local_amount: local.amount,
          remote_tx,
        });
      }
    }

    if (drift_report.length > 0) {
      console.warn(
        `⚠️  Reconciliation drift: ${drift_report.length} issue(s) found`,
      );
      await ReconciliationLog.create({
        status: "issues_found",
        discrepancy_count: drift_report.length,
        mismatches: drift_report,
      });
    } else {
      console.log("✅ Reconciliation: no discrepancies found");
      await ReconciliationLog.create({ status: "clean", discrepancy_count: 0 });
    }

    return drift_report;
  } catch (error) {
    console.error("reconciliation job error:", error);
    await ReconciliationLog.create({
      status: "error",
      error_message: error.message,
    }).catch(() => {});
    throw error;
  }
}

function start_reconciliation_job() {
  cron.schedule("0 1 * * *", () => {
    run_nightly_reconciliation().catch((error) => {
      console.error("reconciliation job error:", error);
    });
  });
}

module.exports = { start_reconciliation_job, run_nightly_reconciliation };
