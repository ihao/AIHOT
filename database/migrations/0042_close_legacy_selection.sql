-- A content approval alone (including auto-public) never authorizes home,
-- event, report or selected-sync placement. Imported selected rows need a
-- separate current curation decision.
UPDATE publications p SET selected=false,indexable=false,reason=NULL,
  selected_ready_at=NULL,visible_after=NULL,updated_at=now()
WHERE p.selected AND NOT EXISTS (
  SELECT 1 FROM editorial_reviews r JOIN articles a ON a.id=r.article_id
    JOIN editorial_curations c ON c.article_id=r.article_id
  WHERE r.article_id=p.article_id AND r.status='approved' AND c.status='approved'
    AND c.fingerprint=r.fingerprint AND c.review_version=r.version
    AND r.article_revision=a.revision AND r.analysis_id=p.analysis_id
);

DELETE FROM selected_ledger l
WHERE NOT EXISTS (SELECT 1 FROM publications p WHERE p.article_id=l.article_id AND p.selected AND p.visibility='public');
DELETE FROM selected_state st
WHERE NOT EXISTS (SELECT 1 FROM publications p WHERE p.article_id=st.article_id AND p.selected AND p.visibility='public');
UPDATE settings SET value=jsonb_build_object('epoch',md5(random()::text || clock_timestamp()::text)),
  updated_by='migration',updated_at=now() WHERE key='selected_ledger_epoch';
