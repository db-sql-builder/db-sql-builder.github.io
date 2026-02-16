// ---------- helpers ----------
const $ = id => document.getElementById(id);
const parseList = str => (str||'').split(/[,\n]/).map(s=>s.trim()).filter(Boolean);
const esc = s => s.replace(/'/g,"''");

// ---------- states ----------
const STATES = {
  AL:'Alabama', AK:'Alaska', AZ:'Arizona', AR:'Arkansas', CA:'California', CO:'Colorado', CT:'Connecticut',
  DE:'Delaware', FL:'Florida', GA:'Georgia', HI:'Hawaii', ID:'Idaho', IL:'Illinois', IN:'Indiana',
  IA:'Iowa', KS:'Kansas', KY:'Kentucky', LA:'Louisiana', ME:'Maine', MD:'Maryland', MA:'Massachusetts',
  MI:'Michigan', MN:'Minnesota', MS:'Mississippi', MO:'Missouri', MT:'Montana', NE:'Nebraska',
  NV:'Nevada', NH:'New Hampshire', NJ:'New Jersey', NM:'New Mexico', NY:'New York', NC:'North Carolina',
  ND:'North Dakota', OH:'Ohio', OK:'Oklahoma', OR:'Oregon', PA:'Pennsylvania', RI:'Rhode Island',
  SC:'South Carolina', SD:'South Dakota', TN:'Tennessee', TX:'Texas', UT:'Utah', VT:'Vermont',
  VA:'Virginia', WA:'Washington', WV:'West Virginia', WI:'Wisconsin', WY:'Wyoming', DC:'District of Columbia'
};

const TZ = {
  east: ['ME','NH','VT','MA','RI','CT','NY','NJ','PA','DE','MD','DC','VA','WV','NC','SC','GA','FL','OH','MI','IN','KY','TN'],
  central: ['AL','MS','WI','IL','MN','IA','MO','AR','LA','ND','SD','NE','KS','OK','TX'],
  mountain: ['MT','WY','CO','NM','AZ','UT','ID'],
  pacific: ['WA','OR','CA','NV'],
  alaska: ['AK'],
  hawaii: ['HI']
};

function renderStates(){
  const mk = abbr => `<label><input type="checkbox" id="state_${abbr}"> ${abbr} - ${STATES[abbr]}</label>`;
  $('tz_east').innerHTML = TZ.east.map(mk).join('');
  $('tz_central').innerHTML = TZ.central.map(mk).join('');
  $('tz_mountain').innerHTML = TZ.mountain.map(mk).join('');
  $('tz_pacific').innerHTML = TZ.pacific.map(mk).join('');
  $('tz_alaska').innerHTML = TZ.alaska.map(mk).join('');
  $('tz_hawaii').innerHTML = TZ.hawaii.map(mk).join('');
}

function bindStateListeners(){
  document.querySelectorAll('input[id^="state_"]').forEach(n=>n.addEventListener('change', buildSQL));
  document.querySelectorAll('[data-selall]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const zone = btn.getAttribute('data-selall');
      TZ[zone].forEach(abbr=>{
        const box = $('state_'+abbr);
        if (box) box.checked = true;
      });
      buildSQL();
    });
  });
}

// ---------- stages ----------
const STAGES = [
  '00-Database Sourced','0-Sourcing','1-Targeted','2-Engaged','3-Recruited','4-Screened',
  '5-Tested','6-Videod','7-Presented','8-Client Interviewed','9-Offer Extended','Placed'
];

function renderStages(){
  $('stage_checks').innerHTML = STAGES.map(s =>
    `<label><input type="checkbox" class="stageKeep" data-stage="${s}" checked> ${s}</label>`
  ).join('');
  document.querySelectorAll('.stageKeep').forEach(ch=>ch.addEventListener('change', buildSQL));
}

// ---------- auto-enable helper ----------
function autoEnable(id, also=[]){
  const c = $(id);
  if (!c) return;
  if (!c.checked) c.checked = true;
  also.forEach(x=>{
    const z = $(x);
    if (z && !z.checked) z.checked = true;
  });
}

function bindAutoEnable(){
  // Experience / industries text areas
  $('exp_keywords').addEventListener('input', ()=>{
    if ($('exp_keywords').value.trim()) autoEnable('exp_keywords_on');
    buildSQL();
  });
  $('exp_industries').addEventListener('input', ()=>{
    if ($('exp_industries').value.trim()) autoEnable('exp_industries_on');
    buildSQL();
  });
  $('ind_keywords').addEventListener('input', ()=>{
    if ($('ind_keywords').value.trim()) autoEnable('ind_kw_on');
    buildSQL();
  });
  $('exp_endmarket').addEventListener('input', ()=>{
    if ($('exp_endmarket').value.trim()) autoEnable('exp_endmarket_on');
    buildSQL();
  });
  $('exp_pb_list').addEventListener('input', ()=>{
    if ($('exp_pb_list').value.trim()) autoEnable('exp_pb_on');
    buildSQL();
  });
  $('exp_pb_label').addEventListener('input', ()=>{
    autoEnable('exp_pb_on');
    buildSQL();
  });
  $('pb_title_patterns').addEventListener('input', ()=>{
    if ($('pb_title_patterns').value.trim()) autoEnable('pb_req_title',['exp_pb_on']);
    buildSQL();
  });
  $('pb_recent_years').addEventListener('input', ()=>{
    autoEnable('pb_req_recent',['exp_pb_on']);
    buildSQL();
  });

  // Size: numbers and buckets
  ['exp_rev_min','exp_rev_max'].forEach(id=>{
    $(id).addEventListener('input', ()=>{
      autoEnable('exp_size_on');
      buildSQL();
    });
  });
  document.querySelectorAll('.bucket').forEach(b=>{
    b.addEventListener('change', ()=>{
      autoEnable('exp_size_on');
      buildSQL();
    });
  });

  // Screenings: comp and relocation
  $('scr_base_lt').addEventListener('input', ()=>{
    autoEnable('scr_comp_filter');
    buildSQL();
  });
  $('scr_ote_lt').addEventListener('input', ()=>{
    autoEnable('scr_comp_filter');
    buildSQL();
  });
  $('scr_relo_yes').addEventListener('change', ()=>{
    buildSQL();
  });

  // Background inference: auto-enable when user edits anything
  ['bg_kw_comm','bg_kw_ops','bg_kw_fin','bg_kw_acc'].forEach(id=>{
    const n = $(id);
    if (!n) return;
    n.addEventListener('input', ()=>{
      autoEnable('exp_bg_on');
      buildSQL();
    });
  });
  ['bg_min_comm','bg_min_ops','bg_min_fin','bg_min_acc'].forEach(id=>{
    const n = $(id);
    if (!n) return;
    n.addEventListener('input', ()=>{
      autoEnable('exp_bg_on');
      buildSQL();
    });
  });
  ['bg_jobfn_counts','acc_cpa_counts'].forEach(id=>{
    const n = $(id);
    if (!n) return;
    n.addEventListener('change', ()=>{
      autoEnable('exp_bg_on');
      buildSQL();
    });
  });
}

// ---------- title patterns ----------
function titlePatterns(){
  return {
    // CEO: remove the stray CFO->CEO replace fragment (was producing invalid SQL)
    t_ceo:`(c.relative_position_ii_c IN ('CEO') OR c.title ILIKE '%chief exec%' OR c.title LIKE '%CEO%')`,
    t_president:`(c.relative_position_ii_c IN ('President') OR (c.title ILIKE '%president%' AND c.title NOT ILIKE '%vice%'))`,
    t_gm:`(c.relative_position_ii_c IN ('GM','General Manager') OR c.title ILIKE '%general manager%' OR c.title ILIKE '% GM%')`,
    t_chairman:`(c.relative_position_ii_c IN ('Chairman / OBD','Chairman','Operating Board Director','OBD') OR c.title ILIKE '%chairman%' OR c.title ILIKE '%board%')`,
    t_fundlevel:`(c.relative_position_ii_c IN ('Fund-Level') OR c.title ILIKE '%fund%' OR c.title ILIKE '%portfolio operations%' OR c.title ILIKE '%investment team%')`,

    t_cfo:`(c.relative_position_ii_c IN ('CFO') OR c.title ILIKE '%chief financ%' OR c.title LIKE '%CFO%')`,
    t_divcfo:`(c.relative_position_ii_c IN ('Divisional CFO') OR (c.title LIKE '%CFO%' AND (c.title ILIKE '%division%' OR c.title ILIKE '%business unit%' OR c.title ILIKE '%segment%' OR c.title ILIKE '%regional%')))`,
    t_vpfin:`(c.relative_position_ii_c IN ('VP Finance') OR ((c.title ILIKE '%vice president%' OR c.title ILIKE '%VP%') AND c.title ILIKE '%financ%'))`,
    t_dirfin:`(c.relative_position_ii_c IN ('Director of Finance') OR (c.title ILIKE '%director%' AND c.title ILIKE '%financ%'))`,
    t_controller:`(c.relative_position_ii_c IN ('Controller') OR c.title ILIKE '%controller%')`,
    t_op_fin:`(c.relative_position_ii_c IN ('OP (Finance)') OR (c.title ILIKE '%operating partner%' AND c.title ILIKE '%financ%'))`,

    t_coo:`(c.relative_position_ii_c IN ('COO') OR c.title ILIKE '%chief operat%' OR c.title LIKE '%COO%')`,
    t_vpops:`(c.relative_position_ii_c IN ('VP Operations','VP Ops') OR ((c.title ILIKE '%vice president%' OR c.title ILIKE '%VP%') AND c.title ILIKE '%operat%'))`,
    t_op_ops:`(c.relative_position_ii_c IN ('OP (Operations)') OR (c.title ILIKE '%operating partner%' AND (c.title ILIKE '%operat%' OR c.title ILIKE '%ops%')))`,
    t_vpcorpdev:`(c.relative_position_ii_c IN ('VP Corp Dev') OR ((c.title ILIKE '%vice president%' OR c.title ILIKE '%VP%') AND c.title ILIKE '%corporate dev%'))`,
    t_dircorpdev:`(c.relative_position_ii_c IN ('Director of Corp Dev') OR (c.title ILIKE '%director%' AND c.title ILIKE '%corporate dev%'))`,

    t_cro:`(c.relative_position_ii_c IN ('CRO') OR c.title ILIKE '%chief revenue%' OR c.title LIKE '%CRO%')`,
    t_cco:`(c.relative_position_ii_c IN ('CCO') OR c.title ILIKE '%chief commercial%' OR c.title LIKE '%CCO%')`,
    t_vpsales:`(c.relative_position_ii_c IN ('VP Sales') OR ((c.title ILIKE '%vice president%' OR c.title ILIKE '%VP%') AND c.title ILIKE '%sales%'))`,
    t_dirsales:`(c.relative_position_ii_c IN ('Director of Sales') OR (c.title ILIKE '%director%' AND c.title ILIKE '%sales%'))`,
    t_vpmarketing:`(c.relative_position_ii_c IN ('VP Marketing') OR ((c.title ILIKE '%vice president%' OR c.title ILIKE '%VP%') AND c.title ILIKE '%market%'))`,
    t_dirmarketing:`(c.relative_position_ii_c IN ('Director of Marketing') OR (c.title ILIKE '%director%' AND c.title ILIKE '%market%'))`,
    t_vprevops:`(c.relative_position_ii_c IN ('VP of Revenue Operations','VP Revenue Operations') OR ((c.title ILIKE '%vice president%' OR c.title ILIKE '%VP%') AND (c.title ILIKE '%revenue operations%' OR c.title ILIKE '%rev ops%' OR c.title ILIKE '%revops%')))`,
    t_dirrevops:`(c.relative_position_ii_c IN ('Director of Revenue Operations') OR (c.title ILIKE '%director%' AND (c.title ILIKE '%revenue operations%' OR c.title ILIKE '%rev ops%' OR c.title ILIKE '%revops%')))`,
    t_op_sales:`(c.relative_position_ii_c IN ('OP (Sales)') OR (c.title ILIKE '%operating partner%' AND c.title ILIKE '%sales%'))`,
    t_cmo:`(c.relative_position_ii_c IN ('CMO') OR c.title ILIKE '%chief marketing%' OR c.title LIKE '%CMO%')`,

    t_chro:`(c.relative_position_ii_c IN ('CHRO') OR c.title ILIKE '%chief human%' OR c.title ILIKE '%chief people officer%' OR c.title LIKE '%CHRO%')`,
    t_vphr:`(c.relative_position_ii_c IN ('VP HR') OR ((c.title ILIKE '%vice president%' OR c.title ILIKE '%VP%') AND (c.title ILIKE '%human resources%' OR c.title ILIKE '%people%')))`,
    t_dirhr:`(c.relative_position_ii_c IN ('Director of HR') OR (c.title ILIKE '%director%' AND (c.title ILIKE '%human resources%' OR c.title ILIKE '%people%')))`,
    t_gc:`(c.relative_position_ii_c IN ('General Counsel','GC') OR c.title ILIKE '%general counsel%' OR c.title LIKE '% GC%')`,

    t_cto:`(c.relative_position_ii_c IN ('CTO') OR c.title ILIKE '%chief technology%' OR c.title LIKE '%CTO%')`,
    t_cio:`(c.relative_position_ii_c IN ('CIO') OR c.title ILIKE '%chief information officer%' OR c.title LIKE '%CIO%')`,
    t_vpit:`(c.relative_position_ii_c IN ('VP of IT','VP IT') OR ((c.title ILIKE '%vice president%' OR c.title ILIKE '%VP%') AND (c.title ILIKE '%information technology%' OR c.title ILIKE '%information systems%' OR c.title ILIKE '% IT%')))`,
    t_vpengineering:`(c.relative_position_ii_c IN ('VP of Engineering') OR ((c.title ILIKE '%vice president%' OR c.title ILIKE '%VP%') AND c.title ILIKE '%engineer%'))`,
    t_cpo:`(c.relative_position_ii_c IN ('CPO') OR c.title ILIKE '%chief product%' OR c.title LIKE '%CPO%')`
  };
}

function titleGroup(){
  const map = titlePatterns();
  const parts = Object.keys(map)
    .filter(id => $(id)?.checked)
    .map(id => map[id]);
  return parts.length ? `(${parts.join(' OR ')})` : '';
}

// ---------- Salesforce industry helpers (used for filters + scoring) ----------
const SF_INDUSTRY_LABELS = {
  ind_process_mfg:'process manufacturing',
  ind_discrete_mfg:'discrete manufacturing',
  ind_engineered_equip:'engineered equipment',
  ind_distribution:'distribution',
  ind_prof_services:'professional services',
  ind_fin_services:'financial services',
  ind_multi_site:'multi-site services',
  ind_saas:'saas',
  ind_it_services:'it services',
  ind_consumer:'consumer',
  ind_retail:'retail',
  ind_food_bev:'food & beverage',
  ind_health_srv_cons:'healthcare services - consumer',
  ind_health_supplies:'healthcare supplies/devices',
  ind_energy:'energy',
  ind_government:'government',
  ind_other:'other',
  ind_other_misc:'other/misc'
};

const SF_INDUSTRY_IDS = [
  'ind_process_mfg','ind_discrete_mfg','ind_engineered_equip','ind_distribution',
  'ind_prof_services','ind_fin_services','ind_multi_site',
  'ind_saas','ind_it_services',
  'ind_consumer','ind_retail','ind_food_bev',
  'ind_health_srv_cons','ind_health_supplies',
  'ind_energy','ind_government','ind_other','ind_other_misc'
];

function getSfIndustrySpecs(){
  const specs = [];
  SF_INDUSTRY_IDS.forEach(id=>{
    const node = $(id);
    if (node && node.checked && SF_INDUSTRY_LABELS[id]){
      specs.push(SF_INDUSTRY_LABELS[id]);
    }
  });
  return specs;
}

function canUseIndustryScore(){
  const sfSpecs = getSfIndustrySpecs();
  const hasSf = sfSpecs.length > 0;

  const liEnabled = $('exp_industries_on')?.checked;
  const liVals = liEnabled ? parseList($('exp_industries').value) : [];
  const hasLi = liVals.length > 0;

  const indKwEnabled = $('ind_kw_on')?.checked;
  const indKwVals = indKwEnabled ? parseList($('ind_keywords').value) : [];
  const hasIndKw = indKwVals.length > 0;

  return hasSf && hasLi && hasIndKw;
}

function updateIndustryScoreToggle(){
  const toggle = $('ind_score_on');
  if (!toggle) return;
  const ok = canUseIndustryScore();
  toggle.disabled = !ok;
  if (!ok) toggle.checked = false;
}

// ---------- industries ----------
function industryGroup(){
  const parts = [];
  SF_INDUSTRY_IDS.forEach(id=>{
    const n = $(id);
    if (n && n.checked){
      const label = SF_INDUSTRY_LABELS[id];
      if (label){
        parts.push(`c.industry_c ILIKE '%${esc(label)}%'`);
      }
    }
  });
  return parts.length ? `(${parts.join(' OR ')})` : '';
}

// ---------- backing ----------
function backingExpr(){
  const map = { bk_pe:'PE', bk_exit:'exit', bk_public:'public', bk_private:'private', bk_vc:'VC' };
  const parts = [];
  Object.keys(map).forEach(id=>{
    if ($(id)?.checked){
      parts.push(`c.backing_exp_last_10_years_c ILIKE '%${esc(map[id])}%'`);
    }
  });
  if (!parts.length) return '';
  const glue = $('backing_logic').value === 'all' ? ' AND ' : ' OR ';
  return `(${parts.join(glue)})`;
}

// ---------- mailing state and city ----------
function mailingStateFilter(){
  const checked = Array.from(document.querySelectorAll('input[id^="state_"]:checked'));
  if (!checked.length) return '';
  const parts = [];
  checked.forEach(n=>{
    const abbr = n.id.replace('state_','');
    const name = STATES[abbr];
    parts.push(`c.mailing_state = '${esc(abbr)}'`);
    // Full state-name equality is redundant if we already have an ILIKE safeguard.
    parts.push(`c.mailing_state ILIKE '%${esc(name.toLowerCase())}%'`);
  });
  return `(${parts.join(' OR ')})`;
}


function mailingCountryFilter(){
  // Optional: enable non-US searches by filtering on c.mailing_country
  // UI expects:
  // - checkbox id="country_on"
  // - text input/textarea id="country_codes" (comma/newline separated, e.g. "US, CA, Canada")
  const on = $('country_on');
  const box = $('country_codes');
  if (!on || !box || !on.checked) return '';
  const vals = parseList(box.value);
  if (!vals.length) return '';
  const parts = [];
  vals.forEach(v=>{
    const raw = v.trim();
    if (!raw) return;
    // If user entered a short code (2-3 letters), treat as exact match.
    if (/^[A-Za-z]{2,3}$/.test(raw)){
      parts.push(`c.mailing_country = '${esc(raw.toUpperCase())}'`);
      return;
    }
    // Otherwise do a substring match against the country name/label.
    parts.push(`c.mailing_country ILIKE '%${esc(raw.toLowerCase())}%'`);
  });
  return parts.length ? `(${parts.join(' OR ')})` : '';
}

function cityGroup(onId, boxId){
  if (!$(onId).checked) return '';
  const vals = parseList($(boxId).value);
  if (!vals.length) return '';
  return `(${vals.map(v => `c.mailing_city ILIKE '%${esc(v)}%'`).join(' OR ')})`;
}

const mailingCityInclude = ()=>cityGroup('city_include_on','city_include');
const mailingCityExclude = ()=>cityGroup('city_exclude_on','city_exclude');

// ---------- misc helpers ----------
function formatInList(values){
  return `(${values.map(v => `'${esc(v)}'`).join(', ')})`;
}

function extractSlug(s){
  try{
    if (s.includes('http')){
      const u = new URL(s.trim());
      const segs = u.pathname.split('/').filter(Boolean);
      const idx = segs.indexOf('company');
      const slug = idx>=0 && segs[idx+1] ? segs[idx+1] : segs[segs.length-1];
      return slug.trim().toLowerCase();
    }
    return s.trim().toLowerCase();
  }catch{
    return s.trim().toLowerCase();
  }
}

// ---------- work experience CTEs ----------
// Now accepts sf1/sf2 so we can derive SF work-industry flags for scoring
function workCtes(sf1, sf2){
  // LinkedIn industries
  const inds = $('exp_industries_on').checked ? parseList($('exp_industries').value) : [];
  // End market
  const ends = $('exp_endmarket_on').checked ? parseList($('exp_endmarket').value) : [];
  // General keywords
  const keysGeneral = $('exp_keywords_on').checked ? parseList($('exp_keywords').value).map(s=>s.toLowerCase()) : [];
  // Industry keywords
  const keysIndustry = $('ind_kw_on').checked ? parseList($('ind_keywords').value).map(s=>s.toLowerCase()) : [];
  // PitchBook companies
  const pbs  = $('exp_pb_on').checked ? parseList($('exp_pb_list').value).map(extractSlug) : [];

  const pbLabel = ($('exp_pb_label').value || 'PB Match').trim() || 'PB Match';

  const kwUse = {
    role_notes:   $('kw_role_notes').checked,
    products:     $('kw_products').checked,
    acct_desc:    $('kw_acct_desc').checked,
    acct_prod:    $('kw_acct_prod').checked,
    contact_notes:$('kw_contact_notes').checked,
    li_json:      $('kw_li_json').checked
  };

  const indCase = inds.length
    ? `CASE ${inds.map(v => `WHEN a.linked_in_industry_c ILIKE '%${esc(v)}%' THEN 1`).join(' ')} ELSE 0 END AS li_industry_match`
    : '';

  const endCase = ends.length
    ? `CASE ${ends.map(v => `WHEN w.end_market_s_c ILIKE '%${esc(v)}%' THEN 1`).join(' ')} ELSE 0 END AS end_market_match`
    : '';

  function buildKeyCase(keys, alias){
    if (!keys.length) return '';
    const pattern = keys.map(v => esc(v)).join('|');
    const lines = [];
    if (kwUse.role_notes)    lines.push(`WHEN LOWER(w.role_notes_c) SIMILAR TO '%(${pattern})%' THEN 1`);
    if (kwUse.products)      lines.push(`WHEN LOWER(w.product_s_or_service_s_c) SIMILAR TO '%(${pattern})%' THEN 1`);
    if (kwUse.acct_desc)     lines.push(`WHEN LOWER(a.description) SIMILAR TO '%(${pattern})%' THEN 1`);
    if (kwUse.acct_prod)     lines.push(`WHEN LOWER(a.products_services_c) SIMILAR TO '%(${pattern})%' THEN 1`);
    if (kwUse.contact_notes) lines.push(`WHEN LOWER(c.analyst_notes_c) SIMILAR TO '%(${pattern})%' THEN 1`);
    if (kwUse.li_json)       lines.push(`WHEN LOWER(c.linked_in_json_c) SIMILAR TO '%(${pattern})%' THEN 1`);
    if (!lines.length) return '';
    return `CASE ${lines.join(' ')} ELSE 0 END AS ${alias}`;
  }

  const keyCaseGeneral = buildKeyCase(keysGeneral,'keyword_found');
  const keyCaseIndustry = buildKeyCase(keysIndustry,'industry_keyword_found');

  const pbCase = pbs.length
    ? `CASE WHEN a.linked_in_name_id_c IN ${formatInList(pbs)} THEN '${esc(pbLabel)}' ELSE NULL END AS PB_list`
    : '';

  // PB gating
  const pbNeedTitle  = $('pb_req_title').checked  && $('pb_title_patterns').value.trim();
  const pbTitleKeys  = pbNeedTitle ? parseList($('pb_title_patterns').value).map(v=>v.toLowerCase()) : [];
  const pbNeedRecent = $('pb_req_recent').checked && Number($('pb_recent_years').value||0)>0;
  const pbYears      = Number($('pb_recent_years').value||0);

  const pbTitleCase = pbNeedTitle
    ? `CASE WHEN ${pbTitleKeys.map(v => `LOWER(w.name) LIKE '%${esc(v)}%'`).join(' OR ')} THEN 1 ELSE 0 END AS pb_title_match`
    : '';

  const pbRecentCase = pbNeedRecent
    ? `CASE WHEN (w.date_to_c IS NULL OR w.date_to_c >= (CURRENT_DATE - INTERVAL '${pbYears} years')) THEN 1 ELSE 0 END AS pb_recent_match`
    : '';

  const sf1Lower = sf1 ? esc(sf1.toLowerCase()) : null;
  const sf2Lower = sf2 ? esc(sf2.toLowerCase()) : null;

  const work_sf1_flag = sf1Lower
    ? `CASE
        WHEN LOWER(COALESCE(w.industry_c,'')) LIKE '%${sf1Lower}%'
        THEN 1 ELSE 0
      END AS work_sf_industry_1_flag`
    : `0 AS work_sf_industry_1_flag`;

  const work_sf2_flag = sf2Lower
    ? `CASE
        WHEN LOWER(COALESCE(w.industry_c,'')) LIKE '%${sf2Lower}%'
        THEN 1 ELSE 0
      END AS work_sf_industry_2_flag`
    : `0 AS work_sf_industry_2_flag`;

  // work_hist
  const work_hist = `,
work_hist AS (
  SELECT
    c.id AS contact_id,
    w.id AS work_id,
    w.name AS title,
    a.name AS company_name,
    a.linked_in_name_id_c,
    w.date_from_c,
    w.date_to_c,
    w.role_notes_c,
    w.product_s_or_service_s_c,
    a.description,
    a.products_services_c,
    a.linked_in_industry_c,
    w.industry_c AS work_industry_c,
    w.end_market_s_c,
    w.start_revenue_c,
    w.end_revenue_c,
    w.approximate_revenue_c
    ${indCase        ?`,\n    ${indCase}`:''}
    ${endCase        ?`,\n    ${endCase}`:''}
    ${keyCaseGeneral ?`,\n    ${keyCaseGeneral}`:''}
    ${keyCaseIndustry?`,\n    ${keyCaseIndustry}`:''}
    ${pbCase         ?`,\n    ${pbCase}`:''}
    ${pbTitleCase    ?`,\n    ${pbTitleCase}`:''}
    ${pbRecentCase   ?`,\n    ${pbRecentCase}`:''}
    , ${work_sf1_flag}
    , ${work_sf2_flag}
  FROM salesforce_sandbox.work_experience_c w
  LEFT JOIN salesforce_sandbox.account a ON w.account_c = a.id
  LEFT JOIN salesforce_sandbox.contact c ON c.id = w.candidate_c
  WHERE a.record_type_id = '012f4000000QWYhAAO'
)`;

  // most recent role
  const work_latest = `,
work_latest AS (
  SELECT * FROM (
    SELECT
      c.id AS contact_id,
      c.name,
      w.id AS work_id,
      w.name AS title,
      a.name AS company_name,
      w.date_from_c,
      w.date_to_c,
      row_number() over (
        partition by c.id
        order by w.date_to_c IS NULL DESC, w.date_to_c DESC
      ) AS rn,
      a.linked_in_industry_c,
      a.backing_c,
      a.revenue_bucket_c,
      a.company_size_c,
      w.end_market_s_c,
      w.start_revenue_c,
      w.end_revenue_c,
      w.approximate_revenue_c
    FROM salesforce_sandbox.work_experience_c w
    LEFT JOIN salesforce_sandbox.account a ON w.account_c = a.id
    LEFT JOIN salesforce_sandbox.contact c ON c.id = w.candidate_c
    WHERE a.record_type_id = '012f4000000QWYhAAO'
  ) t
  WHERE rn = 1
)`;

  // rollup
  const work_rollup = `,
work_rollup AS (
  SELECT
    contact_id,
    MAX(CASE WHEN ${inds.length ? 'li_industry_match = 1'           : 'FALSE'} THEN 1 ELSE 0 END) AS li_industry_match,
    COUNT(DISTINCT CASE WHEN ${inds.length ? 'li_industry_match = 1' : 'FALSE'} THEN linked_in_industry_c END) AS li_industry_distinct_count,
    MAX(CASE WHEN ${ends.length ? 'end_market_match = 1'         : 'FALSE'} THEN 1 ELSE 0 END) AS end_market_match,
    MAX(CASE WHEN ${keysGeneral.length ? 'keyword_found = 1'     : 'FALSE'} THEN 1 ELSE 0 END) AS keyword_found,
    MAX(CASE WHEN ${keysIndustry.length ? 'industry_keyword_found = 1' : 'FALSE'} THEN 1 ELSE 0 END) AS industry_keyword_found,
    SUM(CASE WHEN ${keysIndustry.length ? 'industry_keyword_found = 1' : 'FALSE'} THEN 1 ELSE 0 END) AS industry_keyword_row_count,
    MAX(CASE WHEN ${pbs.length ? 'PB_list IS NOT NULL'           : 'FALSE'} THEN 1 ELSE 0 END) AS pb_any,
    MAX(CASE WHEN ${
      pbs.length
        ? (pbNeedTitle ? '(PB_list IS NOT NULL AND pb_title_match = 1)' : '(PB_list IS NOT NULL)')
        : 'FALSE'
    } THEN 1 ELSE 0 END) AS pb_with_title,
    MAX(CASE WHEN ${
      pbs.length
        ? (pbNeedRecent ? '(PB_list IS NOT NULL AND pb_recent_match = 1)' : '(PB_list IS NOT NULL)')
        : 'FALSE'
    } THEN 1 ELSE 0 END) AS pb_recent,
    MAX(CASE WHEN ${
      pbs.length
        ? (
            (pbNeedTitle || pbNeedRecent)
              ? '(PB_list IS NOT NULL AND ' + [
                  pbNeedTitle  ? 'pb_title_match = 1'   : null,
                  pbNeedRecent ? 'pb_recent_match = 1'  : null
                ].filter(Boolean).join(' AND ') + ')'
              : '(PB_list IS NOT NULL)'
          )
        : 'FALSE'
    } THEN 1 ELSE 0 END) AS pb_ok,
    MAX(work_sf_industry_1_flag) AS has_sf_industry_work_1,
    MAX(work_sf_industry_2_flag) AS has_sf_industry_work_2
  FROM work_hist
  GROUP BY contact_id
)`;

  return work_hist + work_latest + work_rollup;
}

// ---------- background inference CTEs ----------
function expBgCtes(){
  if (!$('exp_bg_on').checked) return '';

  const bgList = id => parseList($(id).value).map(s=>s.toLowerCase()).map(esc);
  const COMM = bgList('bg_kw_comm');
  const OPS  = bgList('bg_kw_ops');
  const FIN  = bgList('bg_kw_fin');
  const ACC  = bgList('bg_kw_acc');

  const mkPat = arr => arr.length ? arr.join('|') : '';
  const commP = mkPat(COMM), opsP = mkPat(OPS), finP = mkPat(FIN), accP = mkPat(ACC);

  const mkClause = pat => {
    if (!pat) return 'FALSE';
    return `(er.role_title SIMILAR TO '%(${pat})%')`;
  };

  return `,
experience_roles AS (
  SELECT
    w.candidate_c AS contact_id,
    LOWER(w.name) AS role_title,
    w.date_to_c,
    row_number() over (
      partition by w.candidate_c
      order by w.date_to_c IS NULL DESC, w.date_to_c DESC
    ) AS rn
  FROM salesforce_sandbox.work_experience_c w
),
experience_rollup AS (
  SELECT
    er.contact_id,

    -- counts across the whole history
    SUM(CASE WHEN ${mkClause(commP)} THEN 1 ELSE 0 END) AS commercial_roles,
    SUM(CASE WHEN ${mkClause(opsP)}  THEN 1 ELSE 0 END) AS operational_roles,
    SUM(CASE WHEN ${mkClause(finP)}  THEN 1 ELSE 0 END) AS finance_roles,
    SUM(CASE WHEN ${mkClause(accP)}  THEN 1 ELSE 0 END) AS accounting_roles,

    -- most recent role flags
    MAX(CASE WHEN er.rn = 1 AND ${mkClause(commP)} THEN 1 ELSE 0 END) AS recent_commercial,
    MAX(CASE WHEN er.rn = 1 AND ${mkClause(opsP)}  THEN 1 ELSE 0 END) AS recent_operational,
    MAX(CASE WHEN er.rn = 1 AND ${mkClause(finP)}  THEN 1 ELSE 0 END) AS recent_finance,
    MAX(CASE WHEN er.rn = 1 AND ${mkClause(accP)}  THEN 1 ELSE 0 END) AS recent_accounting,

    -- Job function multipicklist hints
    MAX(CASE WHEN c.job_function_ii_c ILIKE '%commercial%' THEN 1 ELSE 0 END)  AS jobfn_commercial,
    MAX(CASE WHEN c.job_function_ii_c ILIKE '%operations%' THEN 1 ELSE 0 END)  AS jobfn_operational,
    MAX(CASE WHEN c.job_function_ii_c ILIKE '%finance%'    THEN 1 ELSE 0 END)  AS jobfn_finance,
    MAX(CASE WHEN c.job_function_ii_c ILIKE '%accounting%' THEN 1 ELSE 0 END)  AS jobfn_accounting,

    -- Accounting extra hint: CPA
    MAX(CASE 
          WHEN c.qualifications_c ILIKE '%CPA%'
            OR c.name LIKE '%CPA%'
            OR c.linked_in_json_c LIKE '%CPA%'
          THEN 1 ELSE 0 END) AS has_cpa
  FROM experience_roles er
  LEFT JOIN salesforce_sandbox.contact c ON c.id = er.contact_id
  GROUP BY er.contact_id
)`.trim();
}

// ---------- screenings CTE ----------
function screeningsCte(){
  return `,
candidate_screenings AS (
  SELECT
    candidate_c AS contact_id,
    relocation_flexibility_c,
    created_date,
    CASE
      WHEN current_base_high_c IS NULL AND current_base_low_c IS NOT NULL THEN current_base_low_c
      WHEN current_base_high_c IS NOT NULL AND current_base_low_c IS NOT NULL THEN (current_base_low_c + current_base_high_c) / 2
      ELSE NULL
    END AS current_base_calc,
    CASE
      WHEN current_bonus_high_c IS NULL AND current_bonus_low_c IS NOT NULL THEN current_bonus_low_c
      WHEN current_bonus_high_c IS NOT NULL AND current_bonus_low_c IS NOT NULL THEN (current_bonus_low_c + current_bonus_high_c) / 2
      ELSE NULL
    END AS current_bonus_calc,
    CASE
      WHEN current_ote_high_c IS NULL AND current_ote_low_c IS NOT NULL THEN current_ote_low_c
      WHEN current_ote_high_c IS NOT NULL AND current_ote_low_c IS NOT NULL THEN (current_ote_low_c + current_ote_high_c) / 2
      WHEN current_ote_high_c IS NULL AND current_ote_low_c IS NULL
           AND (CASE WHEN current_base_high_c IS NULL AND current_base_low_c IS NOT NULL THEN current_base_low_c
                     WHEN current_base_high_c IS NOT NULL AND current_base_low_c IS NOT NULL THEN (current_base_low_c + current_base_high_c) / 2
                     ELSE NULL END) IS NOT NULL
           AND (CASE WHEN current_bonus_high_c IS NULL AND current_bonus_low_c IS NOT NULL THEN current_bonus_low_c
                     WHEN current_bonus_high_c IS NOT NULL AND current_bonus_low_c IS NOT NULL THEN (current_bonus_low_c + current_bonus_high_c) / 2
                     ELSE NULL END) IS NOT NULL
      THEN (
        (CASE WHEN current_base_high_c IS NULL AND current_base_low_c IS NOT NULL THEN current_base_low_c
              WHEN current_base_high_c IS NOT NULL AND current_base_low_c IS NOT NULL THEN (current_base_low_c + current_base_high_c) / 2
              ELSE NULL END)
        * (1 + (
          (CASE WHEN current_bonus_high_c IS NULL AND current_bonus_low_c IS NOT NULL THEN current_bonus_low_c
                WHEN current_bonus_high_c IS NOT NULL AND current_bonus_low_c IS NOT NULL THEN (current_bonus_low_c + current_bonus_high_c) / 2
                ELSE NULL END) / 100.0
        ))
      )
      ELSE NULL
    END AS current_ote_calc,
    CASE
      WHEN (CASE WHEN expected_base_high_c IS NULL AND expected_base_low_c IS NOT NULL THEN expected_base_low_c
                 WHEN expected_base_high_c IS NOT NULL AND expected_base_low_c IS NOT NULL THEN (expected_base_low_c + expected_base_high_c) / 2
                 ELSE NULL END) IS NOT NULL
       AND (CASE WHEN expected_bonus_high_c IS NULL AND expected_bonus_low_c IS NOT NULL THEN expected_bonus_low_c
                 WHEN expected_bonus_high_c IS NOT NULL AND expected_bonus_low_c IS NOT NULL THEN (expected_bonus_low_c + expected_bonus_high_c) / 2
                 ELSE NULL END) IS NOT NULL
      THEN (
        (CASE WHEN expected_base_high_c IS NULL AND expected_base_low_c IS NOT NULL THEN expected_base_low_c
              WHEN expected_base_high_c IS NOT NULL AND expected_base_low_c IS NOT NULL THEN (expected_base_low_c + expected_base_high_c) / 2
              ELSE NULL END)
        * (1 + (
          (CASE WHEN expected_bonus_high_c IS NULL AND expected_bonus_low_c IS NOT NULL THEN expected_bonus_low_c
                WHEN expected_bonus_high_c IS NOT NULL AND expected_bonus_low_c IS NOT NULL THEN (expected_bonus_low_c + expected_bonus_high_c) / 2
                ELSE NULL END) / 100.0
        ))
      )
      ELSE NULL
    END AS expected_ote_calc,
    CASE 
      WHEN (CASE WHEN current_base_high_c IS NULL AND current_base_low_c IS NOT NULL THEN current_base_low_c
                 WHEN current_base_high_c IS NOT NULL AND current_base_low_c IS NOT NULL THEN (current_base_low_c + current_base_high_c) / 2
                 ELSE NULL END)
           > (CASE WHEN expected_base_high_c IS NULL AND expected_base_low_c IS NOT NULL THEN expected_base_low_c
                   WHEN expected_base_high_c IS NOT NULL AND expected_base_low_c IS NOT NULL THEN (expected_base_low_c + expected_base_high_c) / 2
                   ELSE NULL END)
         OR (CASE WHEN current_base_high_c IS NULL AND current_base_low_c IS NOT NULL THEN current_base_low_c
                  WHEN current_base_high_c IS NOT NULL AND current_base_low_c IS NOT NULL THEN (current_base_low_c + current_base_high_c) / 2
                  ELSE NULL END) IS NULL
      THEN (CASE WHEN expected_base_high_c IS NULL AND expected_base_low_c IS NOT NULL THEN expected_base_low_c
                 WHEN expected_base_high_c IS NOT NULL AND expected_base_low_c IS NOT NULL THEN (expected_base_low_c + expected_base_high_c) / 2
                 ELSE NULL END)
      ELSE (CASE WHEN current_base_high_c IS NULL AND current_base_low_c IS NOT NULL THEN current_base_low_c
                 WHEN current_base_high_c IS NOT NULL AND current_base_low_c IS NOT NULL THEN (current_base_low_c + current_base_high_c) / 2
                 ELSE NULL END)
    END AS base_to_filter,
    CASE
      WHEN (CASE WHEN current_ote_high_c IS NULL AND current_ote_low_c IS NOT NULL THEN current_ote_low_c
                 WHEN current_ote_high_c IS NOT NULL AND current_ote_low_c IS NOT NULL THEN (current_ote_low_c + current_ote_high_c) / 2
                 ELSE NULL END)
           > (CASE WHEN expected_ote_high_c IS NULL AND expected_ote_low_c IS NOT NULL THEN expected_ote_low_c
                   WHEN expected_ote_high_c IS NOT NULL AND expected_ote_low_c IS NOT NULL THEN (expected_ote_low_c + expected_ote_high_c) / 2
                   ELSE NULL END)
         OR (CASE WHEN current_ote_high_c IS NULL AND current_ote_low_c IS NOT NULL THEN current_ote_low_c
                  WHEN current_ote_high_c IS NOT NULL AND current_ote_low_c IS NOT NULL THEN (current_ote_low_c + current_ote_high_c) / 2
                  ELSE NULL END) IS NULL
      THEN (CASE WHEN expected_ote_high_c IS NULL AND expected_ote_low_c IS NOT NULL THEN expected_ote_low_c
                 WHEN expected_ote_high_c IS NOT NULL AND expected_ote_low_c IS NOT NULL THEN (expected_ote_low_c + expected_ote_high_c) / 2
                 ELSE NULL END)
      ELSE (CASE WHEN current_ote_high_c IS NULL AND current_ote_low_c IS NOT NULL THEN current_ote_low_c
                 WHEN current_ote_high_c IS NOT NULL AND current_ote_low_c IS NOT NULL THEN (current_ote_low_c + current_ote_high_c) / 2
                 ELSE NULL END)
    END AS ote_to_filter,
    row_number() over (partition by candidate_c order by created_date DESC) AS rn
  FROM salesforce_sandbox.candidate_screening_c
)`.trim();
}

// ---------- SF opportunity industry history CTE (for industry score) ----------
function sfOppHistCte(sf1, sf2){
  if (!sf1) return '';
  const sf1Lower = esc(sf1.toLowerCase());
  const sf2Lower = sf2 ? esc(sf2.toLowerCase()) : null;

  return `,
sf_opp_hist AS (
  SELECT
    m.candidate_c AS contact_id,
    MAX(
      CASE
        WHEN LOWER(COALESCE(o.industry_c,'')) LIKE '%${sf1Lower}%'
        THEN 1 ELSE 0
      END
    ) AS opp_sf_industry_1_flag
    ${sf2Lower ? `,
    MAX(
      CASE
        WHEN LOWER(COALESCE(o.industry_c,'')) LIKE '%${sf2Lower}%'
        THEN 1 ELSE 0
      END
    ) AS opp_sf_industry_2_flag` : `,
    0 AS opp_sf_industry_2_flag`}
  FROM salesforce_sandbox.match_c m
  JOIN salesforce_sandbox.opportunity o
    ON o.id = m.search_c
  WHERE NOT m.is_deleted
  GROUP BY m.candidate_c
)`.trim();
}

// ---------- assignment exclusion CTE ----------
function cbadCte(assignId){
  return `,
contacts_already_in_opp AS (
  SELECT id, SUM(match_in_search) AS in_search
  FROM (
    SELECT
      c.id,
      c.name,
      m.name,
      m.search_c,
      CASE WHEN m.search_c = '${esc(assignId)}' THEN 1 ELSE 0 END AS match_in_search
    FROM salesforce_sandbox.contact AS c
    LEFT JOIN salesforce_sandbox.match_c AS m ON m.candidate_c = c.id
    WHERE NOT c.is_deleted AND NOT m.is_deleted
  )
  GROUP BY id
)`.trim();
}

// ---------- max stage CTE ----------
function maxStageCte(){
  return `WITH max_stage AS (
  SELECT candidate_c, id, stage_number, stage_rank, search_c, outcome_match_c, summary_c
  FROM (
    SELECT
      candidate_c,
      id,
      search_c,
      name,
      created_date,
      outcome_match_c,
      summary_c,
      CASE
        WHEN m.stage_c = 'Database Sourced'     THEN '00-Database Sourced'
        WHEN m.stage_c = 'Sourcing'             THEN '0-Sourcing'
        WHEN m.stage_c = 'Targeted'             THEN '1-Targeted'
        WHEN m.stage_c = 'Engaged'              THEN '2-Engaged'
        WHEN m.stage_c = 'Recruited'            THEN '3-Recruited'
        WHEN m.stage_c = 'Screened'             THEN '4-Screened'
        WHEN m.stage_c IN ('Testing','Tested')  THEN '5-Tested'
        WHEN m.stage_c = 'Video Interviewed'    THEN '6-Videod'
        WHEN m.stage_c IN ('Presented','On Slate') THEN '7-Presented'
        WHEN m.stage_c = 'Client Interview'     THEN '8-Client Interviewed'
        WHEN m.stage_c = 'Offer Extended'       THEN '9-Offer Extended'
        WHEN m.stage_c = 'Placed'               THEN 'Placed'
      END AS stage_number,
      CASE
        WHEN m.stage_c = 'Database Sourced'     THEN 0
        WHEN m.stage_c = 'Sourcing'             THEN 1
        WHEN m.stage_c = 'Targeted'             THEN 2
        WHEN m.stage_c = 'Engaged'              THEN 3
        WHEN m.stage_c = 'Recruited'            THEN 4
        WHEN m.stage_c IN ('Testing','Tested')  THEN 5
        WHEN m.stage_c = 'Video Interviewed'    THEN 6
        WHEN m.stage_c IN ('Presented','On Slate') THEN 7
        WHEN m.stage_c = 'Client Interview'     THEN 8
        WHEN m.stage_c = 'Offer Extended'       THEN 9
        WHEN m.stage_c = 'Placed'               THEN 10
        ELSE -1
      END AS stage_rank,
      row_number() over (partition by candidate_c order by
        CASE
          WHEN m.stage_c = 'Database Sourced'     THEN 0
          WHEN m.stage_c = 'Sourcing'             THEN 1
          WHEN m.stage_c = 'Targeted'             THEN 2
          WHEN m.stage_c = 'Engaged'              THEN 3
          WHEN m.stage_c = 'Recruited'            THEN 4
          WHEN m.stage_c IN ('Testing','Tested')  THEN 5
          WHEN m.stage_c = 'Video Interviewed'    THEN 6
          WHEN m.stage_c IN ('Presented','On Slate') THEN 7
          WHEN m.stage_c = 'Client Interview'     THEN 8
          WHEN m.stage_c = 'Offer Extended'       THEN 9
          WHEN m.stage_c = 'Placed'               THEN 10
          ELSE -1
        END DESC,
        created_date DESC
      )
    FROM salesforce_sandbox.match_c AS m
    WHERE NOT is_deleted AND search_c <> '006f400000JEbPAAA1'
  )
  WHERE row_number = 1
)`;
}

// ---------- main SQL builder ----------
function buildSQL(){
  try{
    // keep industry score toggle in sync with prerequisites
    updateIndustryScoreToggle();

    // Decide when CTEs are actually needed
    const liIndList   = $('exp_industries_on').checked ? parseList($('exp_industries').value) : [];
    const hasLinkedInInd = liIndList.length > 0;
    const hasEnd         = $('exp_endmarket_on').checked && parseList($('exp_endmarket').value).length;
    const hasKeywords    = $('exp_keywords_on').checked && parseList($('exp_keywords').value).length;
    const indKwList      = $('ind_kw_on').checked ? parseList($('ind_keywords').value) : [];
    const hasIndKeywords = indKwList.length > 0;
    const hasPB          = $('exp_pb_on').checked && parseList($('exp_pb_list').value).length;
    const hasSize        = $('exp_size_on').checked;
    const hasBg          = $('exp_bg_on').checked;

    const sfSpecs = getSfIndustrySpecs();
    const sf1 = sfSpecs[0] || null;
    const sf2 = sfSpecs[1] || null; // we effectively cap scoring at 2 industries
    const sfCount = sf2 ? 2 : (sf1 ? 1 : 0);

    const useIndustryScore = $('ind_score_on') && $('ind_score_on').checked && sfCount > 0 && hasLinkedInInd && hasIndKeywords;

    const useExperienceCtes = hasLinkedInInd || hasEnd || hasKeywords || hasIndKeywords || hasPB || hasSize || useIndustryScore;
    const useBgCtes         = hasBg;
    const useScreenings     = $('scr_comp_filter').checked || $('scr_relo_yes').checked;
    const useAssignmentExcl = $('f_not_in_assignment').checked && $('assign_id').value.trim();

    let ctes = maxStageCte();
    if (useExperienceCtes) ctes += '\n' + workCtes(sf1, sf2);
    if (useBgCtes)         ctes += '\n' + expBgCtes();
    if (useScreenings)     ctes += '\n' + screeningsCte();
    if (useAssignmentExcl) ctes += '\n' + cbadCte($('assign_id').value.trim());
    if (useIndustryScore)  ctes += '\n' + sfOppHistCte(sf1, sf2);

    const selectCols = [
      "c.id AS contactid",
      "CONCAT(CONCAT(CAST('https://falcon-pe.lightning.force.com/lightning/r/Contact/' AS VARCHAR), c.id), '/view'::VARCHAR) AS sf_contact_link",
      "c.linked_in_url_c AS linked_in_url",
      "c.name AS candidate_name",
      "c.title",
      "c.relative_position_ii_c",
      "c.industry_c",
      "c.mailing_city",
      "c.mailing_state",
      "ms.stage_number",
      "DENSE_RANK() OVER (ORDER BY ms.stage_number DESC) AS priority",
      "ms.outcome_match_c",
      "ms.summary_c"
    ];

    // FROM and joins
    let from = `FROM max_stage AS ms
LEFT JOIN salesforce_sandbox.contact AS c ON c.id = ms.candidate_c`;

    if (useExperienceCtes){
      from += `\nLEFT JOIN work_latest AS w ON w.contact_id = c.id`;
      from += `\nLEFT JOIN work_rollup AS wr ON wr.contact_id = c.id`;

      // Show some work_latest fields when experience CTEs are used
      selectCols.push(
        "w.title AS title_at_matched_company",
        "w.company_name AS matched_company",
        "w.date_from_c AS start_date",
        "w.date_to_c AS end_date"
      );

      if (hasLinkedInInd) selectCols.push("wr.li_industry_match");
      if (hasEnd)         selectCols.push("wr.end_market_match");
      if (hasKeywords)    selectCols.push("wr.keyword_found");
      if (hasPB)          selectCols.push("wr.pb_ok AS pb_match");
      if (hasSize){
        selectCols.push("w.start_revenue_c","w.end_revenue_c","w.approximate_revenue_c");
      }
      // industry_keyword_found & row_count stay internal for scoring unless needed
    }

    if (useIndustryScore){
      from += `\nLEFT JOIN sf_opp_hist AS oph ON oph.contact_id = c.id`;
    }

    if (useBgCtes){
      from += `\nLEFT JOIN experience_rollup AS er ON er.contact_id = c.id`;
      selectCols.push(
        "er.commercial_roles",
        "er.operational_roles",
        "er.finance_roles",
        "er.accounting_roles",
        "er.jobfn_commercial",
        "er.jobfn_operational",
        "er.jobfn_finance",
        "er.jobfn_accounting",
        "er.has_cpa"
      );
    }

    if (useScreenings){
      from += `\nLEFT JOIN candidate_screenings AS scr ON scr.contact_id = c.id AND scr.rn = 1`;
      selectCols.push(
        "scr.base_to_filter",
        "scr.ote_to_filter",
        "scr.current_base_calc",
        "scr.current_ote_calc",
        "scr.expected_ote_calc",
        "scr.relocation_flexibility_c"
      );
    }

    if (useAssignmentExcl){
      from += `\nLEFT JOIN contacts_already_in_opp AS cbad ON cbad.id = c.id`;
    }

    // Industry score columns
    if (useIndustryScore && sf1){
      const sf1Lower = esc(sf1.toLowerCase());
      const sf2Lower = sf2 ? esc(sf2.toLowerCase()) : null;

      const contactSf1Expr = `CASE
  WHEN LOWER(COALESCE(c.industry_c,'')) LIKE '%${sf1Lower}%'
  THEN 1 ELSE 0
END`;

      const contactSf2Expr = sf2Lower ? `CASE
  WHEN LOWER(COALESCE(c.industry_c,'')) LIKE '%${sf2Lower}%'
  THEN 1 ELSE 0
END` : '0';

      let latestLiExpr = '0';
      if (liIndList.length){
        const liConds = liIndList.map(v => `w.linked_in_industry_c ILIKE '%${esc(v)}%'`);
        latestLiExpr = `CASE
  WHEN ${liConds.join(' OR ')}
  THEN 1 ELSE 0
END`;
      }

      let sfScoreExpr;
      if (sfCount === 1){
        // one-industry spec: 20 contact +10 opp +10 work
        sfScoreExpr = `(
  20 * (${contactSf1Expr})
  + 10 * COALESCE(oph.opp_sf_industry_1_flag, 0)
  + 10 * COALESCE(wr.has_sf_industry_work_1, 0)
)`;
      }else{
        // two-industry spec: 10 per contact industry +10 any opp +10 any work
        sfScoreExpr = `(
  10 * (${contactSf1Expr})
  + 10 * (${contactSf2Expr})
  + 10 * CASE
           WHEN COALESCE(oph.opp_sf_industry_1_flag, 0) = 1
             OR COALESCE(oph.opp_sf_industry_2_flag, 0) = 1
           THEN 1 ELSE 0
         END
  + 10 * CASE
           WHEN COALESCE(wr.has_sf_industry_work_1, 0) = 1
             OR COALESCE(wr.has_sf_industry_work_2, 0) = 1
           THEN 1 ELSE 0
         END
)`;
      }

      const liScoreExpr = `(
  10 * CASE WHEN COALESCE(wr.li_industry_match, 0) = 1 THEN 1 ELSE 0 END
  + 10 * CASE WHEN COALESCE(wr.li_industry_distinct_count, 0) >= 2 THEN 1 ELSE 0 END
  + 10 * (${latestLiExpr})
)`;

      const kwScoreExpr = `(
  CASE WHEN COALESCE(wr.industry_keyword_row_count, 0) >= 1 THEN 10 ELSE 0 END
  + CASE WHEN COALESCE(wr.industry_keyword_row_count, 0) >= 2 THEN 10 ELSE 0 END
  + CASE WHEN COALESCE(wr.industry_keyword_row_count, 0) >= 3 THEN 5  ELSE 0 END
  + CASE WHEN COALESCE(wr.industry_keyword_row_count, 0) >= 4 THEN 5  ELSE 0 END
)`;

      selectCols.push(
        `${sfScoreExpr} AS sf_industry_score`,
        `${liScoreExpr} AS li_industry_score`,
        `${kwScoreExpr} AS industry_keyword_score`,
        `(${sfScoreExpr} + ${liScoreExpr} + ${kwScoreExpr}) AS industry_score`
      );
    }

    // WHERE
    const where = ["NOT c.is_deleted"];

    // stages
    const keepStages = Array.from(document.querySelectorAll('.stageKeep'))
      .filter(ch => ch.checked)
      .map(ch => ch.getAttribute('data-stage'));
    if (keepStages.length && keepStages.length < STAGES.length){
      where.push(`ms.stage_number IN (${keepStages.map(s => `'${esc(s)}'`).join(', ')})`);
    }

    const titles = titleGroup();
    if (titles) where.push(titles);

    const inds = industryGroup();
    if (inds) where.push(inds);

    const states = mailingStateFilter();
    if (states) where.push(states);

    const countries = mailingCountryFilter();
    if (countries) where.push(countries);

    const cityInc = mailingCityInclude();
    if (cityInc) where.push(cityInc);

    const cityExc = mailingCityExclude();
    if (cityExc) where.push(`NOT ${cityExc}`);

    const backing = backingExpr();
    if (backing) where.push(backing);

    // Experience matcher logic (non PB, excluding background inference)
    if (useExperienceCtes){
      const parts = [];
      const indOn = hasLinkedInInd;
      const endOn = hasEnd;
      const keyOn = hasKeywords;
      const pbOn  = hasPB;
      const sizeOn = hasSize;
if (endOn) parts.push('wr.end_market_match = 1');
      if (keyOn) parts.push('wr.keyword_found = 1');
      if (pbOn)  parts.push('wr.pb_ok = 1');

      if (sizeOn){
        const revMin = Number($('exp_rev_min').value || 0);
        const revMax = Number($('exp_rev_max').value || 999999);
        const buckets = Array.from(document.querySelectorAll('.bucket:checked')).map(b => b.value);
        const sub = [
          `(w.start_revenue_c IS NOT NULL AND w.end_revenue_c IS NOT NULL AND w.start_revenue_c >= ${revMin} AND w.end_revenue_c <= ${revMax})`
        ];
        if (buckets.length){
          sub.push(`w.approximate_revenue_c IN ${formatInList(buckets)}`);
        }
        parts.push(`(${sub.join(' OR ')})`);
      }

      if (parts.length){
        const glue = $('exp_logic').value === 'all' ? ' AND ' : ' OR ';
        where.push(`(${parts.join(glue)})`);
      }
    }

    // Background thresholds (Any or All across categories)
    if (useBgCtes){
      const bgConds = [];
      const glueBg = $('bg_logic').value === 'all' ? ' AND ' : ' OR ';
      const minComm = Number($('bg_min_comm').value || 0);
      const minOps  = Number($('bg_min_ops').value  || 0);
      const minFin  = Number($('bg_min_fin').value  || 0);
      const minAcc  = Number($('bg_min_acc').value  || 0);

      const useJobFnCounts = $('bg_jobfn_counts').checked;

      if (minComm > 0){
        const extra = useJobFnCounts ? ` OR er.jobfn_commercial = 1` : '';
        bgConds.push(`(er.commercial_roles >= ${minComm}${extra})`);
      }

      if (minOps > 0){
        const extra = useJobFnCounts ? ` OR er.jobfn_operational = 1` : '';
        bgConds.push(`(er.operational_roles >= ${minOps}${extra})`);
      }

      if (minFin > 0){
        const extra = useJobFnCounts ? ` OR er.jobfn_finance = 1` : '';
        bgConds.push(`(er.finance_roles >= ${minFin}${extra})`);
      }

      if (minAcc > 0){
        let accClause = `er.accounting_roles >= ${minAcc}`;
        if ($('acc_cpa_counts').checked){
          accClause = `(${accClause} OR er.has_cpa = 1)`;
        }
        if (useJobFnCounts){
          accClause = `(${accClause} OR er.jobfn_accounting = 1)`;
        }
        bgConds.push(`(${accClause})`);
      }

      if (bgConds.length){
        where.push(`(${bgConds.join(glueBg)})`);
      }
    }

    // Screenings filters
    if (useScreenings){
      if ($('scr_relo_yes').checked){
        where.push(`scr.relocation_flexibility_c = 'Yes'`);
      }
      if ($('scr_comp_filter').checked){
        const baseLt = Number($('scr_base_lt').value || 400);
        const oteLt  = Number($('scr_ote_lt').value  || 600);
        where.push(`(scr.base_to_filter IS NULL OR scr.base_to_filter < ${baseLt})`);
        where.push(`(scr.ote_to_filter IS NULL OR scr.ote_to_filter < ${oteLt})`);
      }
    }

    if (useAssignmentExcl){
      where.push(`cbad.in_search = 0`);
    }

    // Default ordering: priority ASC (1 = furthest stage, higher numbers = earlier stages).
// If Industry Score is enabled, sort by industry_score first, then priority.
const orderExpr = useIndustryScore
  ? `industry_score DESC, priority ASC`
  : `priority ASC`;

    const liIndustryFilterComment = (useExperienceCtes && hasLinkedInInd)
      ? `\n\n/* uncomment to filter on linkedin company\nAND wr.li_industry_match = 1\n*/`
      : '';

    // Final SQL
    let sql = `
${ctes}

-- Export wrapper (commented by default). Use the toggle in Export formatting to uncomment.
-- SELECT '${esc(($('fmt_listname').value||''))}' AS list, contactid, priority${$('fmt_loc').checked ? ', mailing_city, mailing_state' : ''}
-- FROM (
SELECT
  ${selectCols.join(',\n  ')}
${from}
WHERE
  ${where.join('\n  AND ')}${liIndustryFilterComment}
ORDER BY ${orderExpr}
-- ) t
`.trim();

    if ($('fmt_dl').checked){
      sql = sql
        .replace(/-- SELECT/g,'SELECT')
        .replace(/-- FROM/g,'FROM')
        .replace(/-- \)/g,')')
        .replace(/-- \) t/g,') t')
        .replace(/-- Export wrapper.*\n/,'');
    }

    $('finalSql').value = sql + (sql.trim().endsWith(';') ? '' : ';');
  }catch(err){
    $('finalSql').value = `-- Error building SQL: ${err.message}\n-- Check console for details.`;
    console.error(err);
  }
}

// ---------- bindings ----------
function bindGeneral(){
  [
    'exp_logic',
    'exp_industries_on','exp_industries',
    'ind_kw_on','ind_keywords',
    'exp_endmarket_on','exp_endmarket',
    'exp_keywords_on','exp_keywords',
    'kw_role_notes','kw_products','kw_acct_desc','kw_acct_prod','kw_contact_notes','kw_li_json',
    'exp_pb_on','exp_pb_list','exp_pb_label','pb_req_title','pb_title_patterns','pb_req_recent','pb_recent_years',
    'exp_size_on','exp_rev_min','exp_rev_max',
    'exp_bg_on','bg_logic',
    'bg_kw_comm','bg_kw_ops','bg_kw_fin','bg_kw_acc',
    'bg_min_comm','bg_min_ops','bg_min_fin','bg_min_acc','bg_jobfn_counts','acc_cpa_counts',
    'scr_comp_filter','scr_base_lt','scr_ote_lt','scr_relo_yes',
    'f_not_in_assignment','assign_id',
    'fmt_dl','fmt_listname','fmt_loc',
    'backing_logic','city_include_on','city_include','city_exclude_on','city_exclude',
    'country_on','country_codes',
    'ind_score_on'
  ].forEach(id=>{
    const n = $(id);
    if (!n) return;
    n.addEventListener('input', buildSQL);
    n.addEventListener('change', buildSQL);
  });

  // titles, industries and backing checkboxes
  document.addEventListener('change', e=>{
    const id = e.target?.id || '';
    if (id.startsWith('t_') || id.startsWith('ind_') || id.startsWith('bk_')){
      buildSQL();
    }
  });

  // Copy and clear
  $('copyBtn').addEventListener('click', async ()=>{
    try{
      await navigator.clipboard.writeText($('finalSql').value);
      const b = $('copyBtn');
      b.textContent = 'Copied';
      setTimeout(()=>{ b.textContent = 'Copy SQL'; }, 1100);
    }catch{
      alert('Copy failed. Select the text and copy manually.');
    }
  });

  $('clearBtn').addEventListener('click', ()=>{
    document.querySelectorAll('input[type=checkbox]').forEach(ch => ch.checked = false);
    document.querySelectorAll('input[type=text], input[type=number], textarea').forEach(i => i.value = '');
    document.querySelectorAll('select').forEach(s => s.selectedIndex = 0);
    renderStates();
    bindStateListeners();
    renderStages();
    updateIndustryScoreToggle();
    buildSQL();
  });
}

// ---------- bootstrap ----------
document.addEventListener('DOMContentLoaded', ()=>{
  renderStates();
  bindStateListeners();
  renderStages();
  bindAutoEnable();
  bindGeneral();
  updateIndustryScoreToggle();

  // Ensure default accounting keywords include 'accountant'
  const accKw = $('bg_kw_acc');
  if (accKw){
    const cur = (accKw.value || '').trim();
    const has = cur.toLowerCase().split(/,|\n/).map(s=>s.trim()).filter(Boolean).includes('accountant');
    if (!has){
      accKw.value = cur ? `${cur}, accountant` : 'accountant';
    }
  }

  buildSQL();
});
