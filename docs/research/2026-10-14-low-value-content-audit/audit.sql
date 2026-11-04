-- Read-only snapshot; excludes credentials, raw prompts, and article bodies.
BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY;
SET LOCAL statement_timeout = '20s';
WITH listed AS (
  SELECT p.*, an.origin AS analysis_origin, an.relevance AS analysis_relevance,
    an.score AS analysis_score, an.output, an.receipt_ids, an.created_at AS analyzed_at,
    a.body_status, length(a.body_text) AS body_chars, a.grouping_status,
    s.name AS source_name, s.tier, eo.fields AS overrides
  FROM publications p
  JOIN articles a ON a.id=p.article_id
  JOIN sources s ON s.id=p.source_id
  LEFT JOIN analyses an ON an.id=p.analysis_id
  LEFT JOIN editorial_overrides eo ON eo.article_id=p.article_id
  WHERE p.visibility='public' AND p.eligible AND (NOT p.selected OR p.visible_after<=now())
), samples AS (
  SELECT article_id,title,url,score,selected,source_id,source_name,tier,analysis_id,
    analysis_origin,analysis_relevance,analysis_score,
    output->'scores' AS scores,output->'prefilter' AS prefilter,
    output->>'scoreModel' AS score_model,output->>'writer' AS writer,
    output->>'scope' AS scope,published_at,discovered_at,analyzed_at,body_status,body_chars,
    grouping_status,overrides ? 'score' AS has_score_override,
    (SELECT coalesce(jsonb_agg(jsonb_build_object(
       'id',r.id,'status',r.status,'model',r.model,
       'content',r.response->'choices'->0->'message'->>'content') ORDER BY r.id),'[]'::jsonb)
     FROM receipts r WHERE r.id=ANY(l.receipt_ids) AND r.purpose='score_article') AS score_receipts
  FROM listed l WHERE score<10 ORDER BY discovered_at DESC
), buckets AS (
  SELECT CASE WHEN score IS NULL THEN 'null' WHEN score<10 THEN '00-09'
    WHEN score<20 THEN '10-19' WHEN score<30 THEN '20-29' WHEN score<40 THEN '30-39'
    WHEN score<50 THEN '40-49' WHEN score<60 THEN '50-59' ELSE '60+' END AS bucket,
    count(*) AS count,count(*) FILTER(WHERE selected) AS selected
  FROM listed GROUP BY 1 ORDER BY 1
), prefilters AS (
  SELECT output->'prefilter'->>'label' AS label,count(*) AS count,
    count(*) FILTER(WHERE score<10) AS below10,count(*) FILTER(WHERE selected) AS selected
  FROM listed GROUP BY 1 ORDER BY 1
), impacts AS (
  SELECT floor AS proposed_floor,
    count(*) FILTER(WHERE score<floor) AS score_only_removed,
    count(*) FILTER(WHERE score<floor OR output->'prefilter'->>'label'='UNKNOWN') AS score_or_unknown_removed,
    count(*) FILTER(WHERE selected AND (score<floor OR output->'prefilter'->>'label'='UNKNOWN')) AS selected_removed
  FROM listed CROSS JOIN (VALUES (10),(20),(30),(40),(50)) AS thresholds(floor)
  GROUP BY floor ORDER BY floor
), unknowns AS (
  SELECT article_id,title,score,selected,source_id,output->'prefilter' AS prefilter,analyzed_at
  FROM listed WHERE output->'prefilter'->>'label'='UNKNOWN' ORDER BY analyzed_at DESC
)
SELECT jsonb_build_object(
  'snapshot_at',now(),
  'listed', (SELECT jsonb_build_object('total',count(*),'selected',count(*) FILTER(WHERE selected),
    'zero',count(*) FILTER(WHERE score=0),'below10',count(*) FILTER(WHERE score<10),
    'unscored',count(*) FILTER(WHERE score IS NULL)) FROM listed),
  'buckets',(SELECT jsonb_agg(to_jsonb(b)) FROM buckets b),
  'prefilters',(SELECT jsonb_agg(to_jsonb(p)) FROM prefilters p),
  'impacts',(SELECT jsonb_agg(to_jsonb(i)) FROM impacts i),
  'unknowns',(SELECT jsonb_agg(to_jsonb(u)) FROM unknowns u),
  'low_score_items',(SELECT jsonb_agg(to_jsonb(s)) FROM samples s)
);
COMMIT;
