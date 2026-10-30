// Real public numbers for Sonoma County, CA, pulled Oct 30, 2026. Everything else in the preview is sample data.
// Sources: Census QuickFacts and County Business Patterns (API), CSLB license list, BLS metro jobs and local unemployment (API), BLS CPI West.
window.RAINDY = {
  place: "Sonoma County, CA",
  pulled: "Oct 30, 2026",
  people: { total: 486444, households: 190998, renters: 0.374, medianRent: 2158, medianIncome: 104674, year: "July 2025" },
  businesses: { withStaff: 14572, onePerson: 44462, year: 2023 },
  jobs: {
    unemployment: { now: 4.3, yearAgo: 4.6, y2019: 2.7, month: "Sept 2026" },
    all: { now: 206500, yearAgo: 205000, y2019: 209000 },
    construction: { now: 16000, yearAgo: 16300, y2019: 16500 },
    food: { now: 18000, yearAgo: 17300, y2019: 17700 },
    hourly: { now: 39.24, yearAgo: 39.10, y2019: 29.38 }
  },
  prices: { all: 3.2, eatingOut: 2.9, groceries: 2.6, shelter: 2.4, month: "June 2026", region: "West" },
  // Prices rose about 19% from 2019 to 2023, so pay that rose about 19% just kept up.
  priceRise2019to2023: 19,
  // Businesses with staff (Census, 2023 vs 2019) and licensed businesses (CSLB, Oct 2026). Pay is payroll per worker.
  trades: [
    { name: "Plumbing and heating/air", estab: 262, workers: 2054, workersChange: 3, pay: 86.6, payChange: 19, licensed: 520, licLabel: "plumbing or heating/air licenses" },
    { name: "Electrical", estab: 234, workers: 1734, workersChange: 13, pay: 86.3, payChange: 13, licensed: 580, oneMan: 288, licLabel: "electrical licenses" },
    { name: "Roofing", estab: 65, workers: 492, workersChange: 5, pay: 88.8, payChange: 37 },
    { name: "Painting", estab: 148, workers: 635, workersChange: 14, pay: 62.9, payChange: 16, licensed: 408, oneMan: 198, licLabel: "painting licenses" },
    { name: "Landscaping", estab: 301, workers: 2645, workersChange: 36, pay: 53.0, payChange: 18, licensed: 372, oneMan: 138, licLabel: "landscaping licenses" },
    { name: "Home remodeling", estab: 481, workers: 1980, workersChange: -6, pay: 64.6, payChange: 13, licensed: 2278, oneMan: 1278, licLabel: "general building licenses" },
    { name: "Car repair", estab: 150, workers: 631, workersChange: 14, pay: 60.1, payChange: 24 },
    { name: "Child care", estab: 152, workers: 895, workersChange: -5, pay: 33.6, payChange: 25 },
    { name: "Grocery stores", estab: 147, workers: 6022, workersChange: 1, pay: 39.6, payChange: 21 },
    { name: "Full-service restaurants", estab: 511, workers: 9018, workersChange: -8, pay: 34.1, payChange: 35 },
    { name: "Fast food and counter service", estab: 354, workers: 5778, workersChange: 16, pay: 27.6, payChange: 38 }
  ],
  sources: [
    ["Census QuickFacts, Sonoma County", "https://www.census.gov/quickfacts/fact/table/sonomacountycalifornia/INC110219"],
    ["Census County Business Patterns, 2019 and 2023", "https://www.census.gov/programs-surveys/cbp.html"],
    ["CSLB Public Data Portal, licenses by county", "https://www.cslb.ca.gov/onlineservices/dataportal/"],
    ["BLS metro jobs and local unemployment", "https://www.bls.gov/sae/"],
    ["BLS CPI, West region, June 2026", "https://www.bls.gov/regions/west/news-release/2026/consumerpriceindex_west_20260714.htm"]
  ]
};
