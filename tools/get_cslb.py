"""Download the state contractor license lists (CSLB "List by Classification and County"), one
.xlsx per classification, for up to 10 counties at once. Input for add_licenses.py.

python3 tools/get_cslb.py cslb_folder [classification ...]

COUNTIES are the state's own county numbers (see the county box on the CSLB page):
1 Alameda, 7 Contra Costa, 21 Marin, 28 Napa, 38 San Francisco, 41 San Mateo, 43 Santa Clara,
48 Solano, 49 Sonoma. The state site turns away requests that come too fast, so this waits
between downloads and tries again. Files already downloaded are skipped, so it's safe to rerun.
"""
import re, sys, time, html, os, requests
URL = 'https://www.cslb.ca.gov/onlineservices/dataportal/ListByCounty'
COUNTIES = ['1', '7', '21', '28', '38', '41', '43', '48']
out = sys.argv[1]
only = sys.argv[2:] 
s = requests.Session()
def form():
    p = s.get(URL, timeout=60).text
    f = {n: html.unescape(v) for n, v in re.findall(r'name="(__[A-Z]+)"[^>]*value="([^"]*)"', p)}
    classes = re.findall(r'<option value="([^"]+)">', p.split('lbCounty')[0])
    # C-61 on its own isn't a list; its D- subclasses are.
    return f, [c for c in dict.fromkeys(classes) if c != 'C-61']
f, classes = form()
todo = only or classes
print(len(todo), 'classes', flush=True)
for c in todo:
    path = os.path.join(out, c.replace('/', '_') + '.xlsx')
    if os.path.exists(path) and open(path, 'rb').read(2) == b'PK': continue
    for attempt in range(8):
        try:
            f, _ = form()
            data = list(f.items()) + [('ctl00$MainContent$lbClassification', c)] + [('ctl00$MainContent$lbCounty', x) for x in COUNTIES] + [('ctl00$MainContent$btnSearch', 'Search')]
            r = s.post(URL, data=data, timeout=180)
            if r.content[:2] == b'PK':
                open(path, 'wb').write(r.content); print(c, len(r.content), flush=True); break
            print(c, 'not a file, try', attempt, r.headers.get('content-type'), len(r.content), flush=True)
            if attempt == 0: open(path + '.html', 'wb').write(r.content)
        except Exception as e:
            print(c, 'error', e, flush=True)
        time.sleep(30)
    time.sleep(8)
