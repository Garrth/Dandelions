"""Rai's numbers: pull the public numbers for each county and write public/data/rai/<fips>.json.

Runs every week from .github/workflows/rai-numbers.yml, or by hand:
    python3 tools/rai_numbers.py
Optional: BLS_API_KEY (a free key from https://data.bls.gov/registrationEngine/) lifts the
daily limit that the BLS puts on shared computers.

Built to keep working when a source has a bad day: each part is pulled on its own, and if one
fails, last week's numbers for that part stay in the file with their old date. Nothing is ever
replaced by a blank.

Sources, all free and public:
- BLS local area employment (LAUS): people working, labor force, unemployment rate, by county.
- BLS metro jobs (CES): jobs and average hourly pay in the metro area.
- BLS consumer prices (CPI) for the region: all prices, eating out, groceries, housing, gas.
- BLS average prices: eggs, milk, bread, ground beef, gas, electricity.
- California EDD WARN notices: layoffs companies report ahead of time.
- tools/rai/<fips>.json: the yearly numbers (Census, MIT living wage), updated by hand once a year.
"""
import datetime, glob, io, json, os, re, sys, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'public', 'data', 'rai')
UA = {'User-Agent': 'dandelions-rai-numbers/1.0 (+https://www.dandelions.lol)'}
TODAY = datetime.date.today()


def log(*a):
    print(*a, file=sys.stderr)


def get(url, data=None, headers=None, timeout=60):
    req = urllib.request.Request(url, data=data, headers=dict(UA, **(headers or {})))
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read()


# ---- BLS ----
BASKET = [  # (name, unit, series, area)
    ('Eggs', 'dozen', 'APU0000708111', 'US'),
    ('Milk', 'gallon', 'APU{r}709112', 'region'),
    ('Bread', 'pound', 'APU{r}702111', 'region'),
    ('Ground beef', 'pound', 'APU{r}703112', 'region'),
    ('Gas', 'gallon', 'APU{r}7471A', 'region'),
    ('Electricity', 'kWh', 'APU{r}72610', 'region'),
]
CPI = [  # (name, series)
    ('All prices', 'CUUR{r}SA0'),
    ('Groceries', 'CUUR{r}SAF11'),
    ('Eating out', 'CUUR{r}SEFV'),
    ('Housing', 'CUUR{r}SAH1'),
    ('Gas', 'CUUR{r}SETB01'),
]


def bls(series):
    """{series: [(year, month, value), ...] newest first}. Raises on failure."""
    body = {'seriesid': series, 'startyear': str(TODAY.year - 2), 'endyear': str(TODAY.year)}
    if os.environ.get('BLS_API_KEY'):
        body['registrationkey'] = os.environ['BLS_API_KEY']
    d = json.loads(get('https://api.bls.gov/publicAPI/v2/timeseries/data/', json.dumps(body).encode(), {'Content-Type': 'application/json'}))
    if d.get('status') != 'REQUEST_SUCCEEDED':
        raise RuntimeError('BLS: %s' % d.get('message'))
    out = {}
    for s in d['Results']['series']:
        rows = []
        for x in s['data']:
            if not re.match(r'^M(0[1-9]|1[0-2])$', x['period']):
                continue
            try:
                rows.append((int(x['year']), int(x['period'][1:]), float(x['value'])))
            except ValueError:
                continue
        rows.sort(reverse=True)
        if rows:
            out[s['seriesID']] = rows
    return out


def month_name(y, m):
    return datetime.date(y, m, 1).strftime('%b %Y')


def year_ago(rows):
    """The value 12 months before the newest one, or None."""
    y, m, _ = rows[0]
    for yy, mm, v in rows:
        if yy == y - 1 and mm == m:
            return v
    return None


def series_block(rows, keep=25):
    return {'month': month_name(*rows[0][:2]), 'now': rows[0][2], 'yearAgo': year_ago(rows),
            'history': [[month_name(y, m), v] for y, m, v in rows[:keep]][::-1]}


def pull_bls(c):
    r = c['cpiRegion']
    ids = {
        'working': c['laus'] + '05', 'laborForce': c['laus'] + '06', 'unemployment': c['laus'] + '03',
        'jobs': c['ces'] + '0000000001', 'hourly': c['ces'] + '0500000003',
    }
    basket = [(n, u, s.format(r=r), a) for n, u, s, a in BASKET]
    cpi = [(n, s.format(r=r)) for n, s in CPI]
    want = list(ids.values()) + [b[2] for b in basket] + [x[1] for x in cpi]
    data = bls(want)
    missing = [x for x in want if x not in data]
    if missing:
        log(c['fips'], 'BLS had no numbers for:', ', '.join(missing))
    out = {}
    work = {k: series_block(data[v]) for k, v in ids.items() if v in data}
    if work:
        out['working'] = dict(work, source='BLS Local Area Unemployment Statistics and Current Employment Statistics', area=c['name'],
                              jobsArea=c.get('cesName', 'metro area'))
    items = []
    for n, u, s, a in basket:
        if s in data:
            rows = data[s]
            items.append({'name': n, 'unit': u, 'price': rows[0][2], 'yearAgo': year_ago(rows), 'month': month_name(*rows[0][:2]),
                          'area': 'US average' if a == 'US' else c['regionName'] + ' average'})
    if items:
        out['basket'] = {'items': items, 'source': 'BLS Average Price Data'}
    changes = []
    for n, s in cpi:
        if s in data and year_ago(data[s]):
            rows = data[s]
            changes.append({'name': n, 'change': round((rows[0][2] / year_ago(rows) - 1) * 100, 1), 'month': month_name(*rows[0][:2])})
    if changes:
        out['prices'] = {'items': changes, 'region': c['regionName'], 'source': 'BLS Consumer Price Index'}
    return out


# ---- California WARN notices ----
WARN_PAGE = 'https://edd.ca.gov/en/jobs_and_training/Layoff_Services_WARN'


def warn_files():
    links = []
    try:
        html = get(WARN_PAGE).decode('utf-8', 'replace')
        for h in re.findall(r'href="([^"]+\.xlsx)"', html, re.I):
            if 'warn' in h.lower():
                links.append(h if h.startswith('http') else 'https://edd.ca.gov' + h)
    except Exception as e:
        log('WARN page:', e)
    if not links:
        links = ['https://edd.ca.gov/siteassets/files/jobs_and_training/warn/warn_report1.xlsx']
    return list(dict.fromkeys(links))[:3]


def as_date(v):
    if isinstance(v, datetime.datetime):
        return v.date()
    if isinstance(v, datetime.date):
        return v
    for f in ('%m/%d/%Y', '%Y-%m-%d', '%m/%d/%y'):
        try:
            return datetime.datetime.strptime(str(v).strip(), f).date()
        except ValueError:
            pass
    return None


def pull_warn(counties):
    import openpyxl
    notices = []
    for url in warn_files():
        try:
            wb = openpyxl.load_workbook(io.BytesIO(get(url)), read_only=True, data_only=True)
        except Exception as e:
            log('WARN file:', url, e)
            continue
        for ws in wb.worksheets:
            rows = ws.iter_rows(values_only=True)
            head = None
            for _ in range(15):  # the header row isn't always the first one
                r = next(rows, None)
                if r is None:
                    break
                cells = [str(x or '').strip().lower() for x in r]
                if any('county' in x for x in cells) and any('employees' in x for x in cells):
                    head = cells
                    break
            if not head:
                continue
            col = lambda *names: next((i for i, h in enumerate(head) if any(n in h for n in names)), None)
            ic, ie, ico = col('county'), col('employees'), col('company')
            idt = col('received', 'notice date') if col('received', 'notice date') is not None else col('date')
            icity = col('city', 'address')
            if None in (ic, ie, ico, idt):
                continue
            for r in rows:
                if not r or len(r) <= max(ic, ie, ico, idt):
                    continue
                try:
                    n = int(float(str(r[ie]).replace(',', '')))
                except ValueError:
                    continue
                d = as_date(r[idt])
                if not d:
                    continue
                notices.append({'county': str(r[ic] or '').strip(), 'company': str(r[ico] or '').strip(), 'workers': n, 'date': d,
                                'place': str(r[icity] or '').strip() if icity is not None else ''})
    if not notices:
        raise RuntimeError('no WARN notices read')
    out = {}
    for fips, c in counties.items():
        name = c['warnCounty'].lower()
        mine, seen = [], set()
        for x in notices:  # the same notice can be in more than one file
            key = (x['company'].lower(), x['date'], x['workers'])
            if name in x['county'].lower() and key not in seen:
                seen.add(key)
                mine.append(x)
        mine.sort(key=lambda x: x['date'], reverse=True)
        year = [x for x in mine if (TODAY - x['date']).days <= 365]
        month = [x for x in year if (TODAY - x['date']).days <= 30]
        out[fips] = {
            'last30': {'notices': len(month), 'workers': sum(x['workers'] for x in month)},
            'last365': {'notices': len(year), 'workers': sum(x['workers'] for x in year)},
            'recent': [{'company': x['company'], 'workers': x['workers'], 'date': x['date'].isoformat()} for x in year[:8]],
            'source': 'California EDD WARN notices', 'note': 'Notices that bigger companies must file before a large layoff or closing. One layoff can be split across several sites, so some numbers are small. Notices don\'t say why.'
        }
    return out


# ---- Put it together ----
def main():
    counties = {}
    for p in sorted(glob.glob(os.path.join(ROOT, 'tools', 'rai', '*.json'))):
        c = json.load(open(p))
        counties[c['fips']] = c
    os.makedirs(OUT, exist_ok=True)
    try:
        warn = pull_warn({f: c for f, c in counties.items() if c.get('state') == 'CA'})
    except Exception as e:
        log('WARN failed, keeping last numbers:', e)
        warn = {}
    for fips, c in counties.items():
        path = os.path.join(OUT, fips + '.json')
        old = json.load(open(path)) if os.path.exists(path) else {}
        new = dict(old)
        new.update({'fips': fips, 'place': c['name'], 'yearly': c['yearly']})
        try:
            parts = pull_bls(c)
            for k, v in parts.items():
                v['pulled'] = TODAY.isoformat()
                new[k] = v
        except Exception as e:
            log(fips, 'BLS failed, keeping last numbers:', e)
        if fips in warn:
            warn[fips]['pulled'] = TODAY.isoformat()
            new['layoffs'] = warn[fips]
        changed = json.dumps({k: v for k, v in new.items() if k != 'checked'}, sort_keys=True) != json.dumps({k: v for k, v in old.items() if k != 'checked'}, sort_keys=True)
        new['checked'] = TODAY.isoformat() if changed or not old.get('checked') else old['checked']
        if changed or not os.path.exists(path):
            json.dump(new, open(path, 'w'), separators=(',', ':'))
            log(fips, 'updated:', ', '.join(k for k in ('working', 'basket', 'prices', 'layoffs') if k in new))
        else:
            log(fips, 'no change')


if __name__ == '__main__':
    main()
