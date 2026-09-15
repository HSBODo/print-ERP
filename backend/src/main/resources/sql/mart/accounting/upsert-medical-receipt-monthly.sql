INSERT INTO mart_medical_receipt_monthly (
    yr, mo, receipt_count,
    copay_due, claim_amount, salary_total, non_covered, discount,
    outstanding_recovered, refund, outstanding_new, refund_occurred, health_living,
    net, loaded_at
) VALUES (
    :yr, :mo, :receiptCount,
    :copayDue, :claimAmount, :salaryTotal, :nonCovered, :discount,
    :outstandingRecovered, :refund, :outstandingNew, :refundOccurred, :healthLiving,
    :net, CURRENT_TIMESTAMP
)
ON CONFLICT (yr, mo) DO UPDATE SET
    receipt_count         = EXCLUDED.receipt_count,
    copay_due             = EXCLUDED.copay_due,
    claim_amount          = EXCLUDED.claim_amount,
    salary_total          = EXCLUDED.salary_total,
    non_covered           = EXCLUDED.non_covered,
    discount              = EXCLUDED.discount,
    outstanding_recovered = EXCLUDED.outstanding_recovered,
    refund                = EXCLUDED.refund,
    outstanding_new       = EXCLUDED.outstanding_new,
    refund_occurred       = EXCLUDED.refund_occurred,
    health_living         = EXCLUDED.health_living,
    net                   = EXCLUDED.net,
    loaded_at             = CURRENT_TIMESTAMP
