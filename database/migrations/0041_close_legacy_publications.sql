-- Existing AIHOT projections never imply a 9BTC editorial decision. The
-- publication table is the origin read surface for detail, lists, APIs and RSS.
UPDATE publications p
SET visibility='withdrawn', selected=false, eligible=false, indexable=false,
    selected_ready_at=NULL, visible_after=NULL, reason=NULL, updated_at=now()
WHERE NOT EXISTS (
  SELECT 1 FROM editorial_reviews r JOIN articles a ON a.id=r.article_id
  WHERE r.article_id=p.article_id AND r.status IN ('approved','auto_public')
    AND r.article_revision=a.revision AND r.analysis_id=p.analysis_id
);

-- A prior selected sync watermark must not replay AIHOT titles after cutover.
DELETE FROM selected_ledger l
WHERE EXISTS (SELECT 1 FROM publications p WHERE p.article_id=l.article_id AND p.visibility='withdrawn');
DELETE FROM selected_state st
WHERE EXISTS (SELECT 1 FROM publications p WHERE p.article_id=st.article_id AND p.visibility='withdrawn');
INSERT INTO settings (key,value,updated_by)
VALUES ('selected_ledger_epoch',jsonb_build_object('epoch',md5(random()::text || clock_timestamp()::text)),'migration')
ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value,updated_by='migration',updated_at=now();
