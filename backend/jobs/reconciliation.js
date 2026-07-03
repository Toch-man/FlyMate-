const cron = require("node-cron");
const Transaction = require("../models/transaction.model");
const { fetch_transactions } = require("../services/nomba.service");

// Matches your training's exact recommended pattern: pull Nomba's own
// record of transactions, then diff against our local ledger by
// merchantTxRef (the source of truth — Nomba's internal IDs can rotate on
// retries, so never join on those).
//
// Runs nightly rather than weekly, per the training's explicit guidance
// ("the daily discipline..."). Looking back 2 days each run (not just 1)
// gives a small overlap in case a run is ever missed or delayed — Nomba
// transactions are matched by merchantTxRef either way, so re-checking an
// already-reconciled transaction is harmless, just slightly redundant.
async function run_nightly_reconciliation() {
  const end_date = new Date();
  const start_date = new Date(end_date.getTime() - 2 * 24 * 60 * 60 * 1000);

  const format_date = (date) => date.toISOString().slice(0, 10); // YYYY-MM-DD

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

    // Nomba amounts are in kobo, our local Transaction.amount is stored in
    // naira — convert before comparing.
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
    // TODO: wire this to something more visible than console (Slack webhook,
    // email, admin notification) once you have a place for it to go — for
    // the hackathon, a loud log is enough to demonstrate the discipline.
    console.warn(
      `⚠️  Reconciliation drift: ${drift_report.length} issue(s) found`,
    );
    console.warn(JSON.stringify(drift_report, null, 2));
  } else {
    console.log("✅ Reconciliation: no discrepancies found");
  }

  return drift_report;
}

function start_reconciliation_job() {
  // Runs nightly at 1 AM.
  cron.schedule("0 1 * * *", () => {
    run_nightly_reconciliation().catch((error) => {
      console.error("reconciliation job error:", error);
    });
  });
}

module.exports = { start_reconciliation_job, run_nightly_reconciliation };
